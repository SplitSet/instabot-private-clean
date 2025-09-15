const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and check if still exists and active
    const user = await User.findById(decoded.id).select('+refreshTokens');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Check if user account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts.'
      });
    }

    // Add user to request object
    req.user = user;
    req.userId = user._id.toString();
    
    // Log successful authentication
    logger.security('User authenticated successfully', {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    next();
  } catch (error) {
    logger.security('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      token: req.header('Authorization')?.substring(0, 20) + '...'
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};

// Middleware to check if user has valid subscription
const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user has valid subscription
    if (!req.user.hasValidSubscription()) {
      return res.status(402).json({
        success: false,
        message: 'Active subscription required to access this feature.',
        code: 'SUBSCRIPTION_REQUIRED',
        subscriptionStatus: req.user.subscription.status,
        currentPeriodEnd: req.user.subscription.currentPeriodEnd
      });
    }

    next();
  } catch (error) {
    logger.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Subscription verification error.'
    });
  }
};

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (req.user.role !== 'admin') {
      logger.security('Unauthorized admin access attempt', {
        userId: req.user._id,
        email: req.user.email,
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization error.'
    });
  }
};

// Middleware to refresh token if needed
const refreshTokenIfNeeded = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.decode(token);
      const now = Date.now() / 1000;
      
      // If token expires in less than 5 minutes, try to refresh
      if (decoded && decoded.exp - now < 300) {
        const refreshToken = req.header('x-refresh-token');
        
        if (refreshToken) {
          try {
            const refreshDecoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const user = await User.findById(refreshDecoded.id);
            
            if (user && user.refreshTokens.some(rt => rt.token === refreshToken && rt.isActive)) {
              const newToken = user.generateAuthToken();
              res.setHeader('x-new-token', newToken);
            }
          } catch (refreshError) {
            // Refresh failed, but don't block the request
            logger.warn('Token refresh failed:', refreshError.message);
          }
        }
      }
    }
    
    next();
  } catch (error) {
    // Don't block request if refresh fails
    logger.warn('Token refresh middleware error:', error.message);
    next();
  }
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive && !user.isLocked) {
      req.user = user;
      req.userId = user._id.toString();
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth
    next();
  }
};

// Rate limiting for sensitive operations
const sensitiveOperation = (req, res, next) => {
  logger.audit('Sensitive operation attempted', req.userId, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
};

module.exports = {
  auth,
  requireSubscription,
  requireAdmin,
  refreshTokenIfNeeded,
  optionalAuth,
  sensitiveOperation
};
