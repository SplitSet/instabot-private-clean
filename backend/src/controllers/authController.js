const { validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MetaApiService = require('../services/MetaApiService');
const logger = require('../utils/logger');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new user
      const user = new User({
        name,
        email,
        password,
        emailVerificationToken: crypto.randomBytes(32).toString('hex'),
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      await user.save();

      // Email verification disabled: no email is sent in this build

      // Generate tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      await user.save();

      logger.audit('User registered', user._id, {
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            subscription: user.subscription
          },
          tokens: {
            access: accessToken,
            refresh: refreshToken
          }
        }
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user and include password for comparison
      const user = await User.findByEmail(email).select('+password +refreshTokens');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        // Increment login attempts
        await user.incLoginAttempts();
        
        logger.security('Failed login attempt', {
          email,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last login info
      user.lastLogin = new Date();
      user.lastLoginIP = req.ip;

      // Generate tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      await user.save();

      logger.audit('User logged in', user._id, {
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            subscription: user.subscription,
            lastLogin: user.lastLogin
          },
          tokens: {
            access: accessToken,
            refresh: refreshToken
          }
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Find user and check if refresh token exists and is active
      const user = await User.findById(decoded.id).select('+refreshTokens');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      const storedToken = user.refreshTokens.find(
        token => token.token === refreshToken && token.isActive
      );

      if (!storedToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        // Remove expired token
        user.refreshTokens = user.refreshTokens.filter(
          token => token.token !== refreshToken
        );
        await user.save();

        return res.status(401).json({
          success: false,
          message: 'Refresh token has expired'
        });
      }

      // Generate new access token
      const newAccessToken = user.generateAuthToken();

      logger.audit('Token refreshed', user._id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken
        }
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const refreshToken = req.header('x-refresh-token');
      
      if (refreshToken) {
        // Remove specific refresh token
        req.user.refreshTokens = req.user.refreshTokens.filter(
          token => token.token !== refreshToken
        );
        await req.user.save();
      }

      logger.audit('User logged out', req.user._id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  // Logout from all devices
  async logoutAll(req, res) {
    try {
      // Clear all refresh tokens
      req.user.refreshTokens = [];
      await req.user.save();

      logger.audit('User logged out from all devices', req.user._id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });

    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout all failed'
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user._id).select('-password -refreshTokens');
      
      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const updates = {};
      const allowedUpdates = ['name', 'timezone', 'language'];
      
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
      ).select('-password -refreshTokens');

      logger.audit('Profile updated', user._id, {
        updates: Object.keys(updates),
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id).select('+password +refreshTokens');
      
      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      
      // Clear all refresh tokens to force re-login on all devices
      user.refreshTokens = [];
      
      await user.save();

      logger.audit('Password changed', user._id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }

  // Get Meta OAuth URL
  async getMetaAuthUrl(req, res) {
    try {
      const { platform } = req.query;
      
      if (!['instagram', 'facebook'].includes(platform)) {
        return res.status(400).json({
          success: false,
          message: 'Platform must be instagram or facebook'
        });
      }

      const redirectUri = `${process.env.FRONTEND_URL}/auth/meta/callback`;
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in user session for security
      req.user.metaOAuthState = state;
      await req.user.save();

      let scope, authUrl;
      
      if (platform === 'instagram') {
        scope = 'instagram_basic,instagram_manage_comments,pages_show_list';
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
          `client_id=${process.env.META_APP_ID}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${scope}&` +
          `state=${state}&` +
          `response_type=code`;
      } else {
        scope = 'pages_manage_posts,pages_read_engagement,pages_manage_engagement';
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
          `client_id=${process.env.META_APP_ID}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${scope}&` +
          `state=${state}&` +
          `response_type=code`;
      }

      res.json({
        success: true,
        data: {
          authUrl,
          state
        }
      });

    } catch (error) {
      logger.error('Get Meta auth URL error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate authorization URL'
      });
    }
  }

  // Handle Meta OAuth callback
  async handleMetaCallback(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { code, platform, state } = req.body;

      // Verify state parameter
      if (state !== req.user.metaOAuthState) {
        return res.status(400).json({
          success: false,
          message: 'Invalid state parameter'
        });
      }

      // Exchange code for access token
      const tokenResponse = await MetaApiService.exchangeCodeForToken(code);
      
      if (!tokenResponse.access_token) {
        return res.status(400).json({
          success: false,
          message: 'Failed to obtain access token'
        });
      }

      // Get long-lived token
      const longLivedToken = await MetaApiService.getLongLivedToken(tokenResponse.access_token);
      
      // Update user with tokens
      if (platform === 'instagram') {
        // Get Instagram Business Account
        const accountInfo = await MetaApiService.getInstagramAccount(longLivedToken.access_token);
        
        req.user.metaTokens.instagramAccessToken = longLivedToken.access_token;
        req.user.metaTokens.instagramTokenExpires = new Date(Date.now() + (longLivedToken.expires_in * 1000));
        req.user.metaTokens.instagramBusinessAccountId = accountInfo.data[0]?.instagram_business_account?.id;
      } else {
        // Get Facebook Page info
        const pageInfo = await MetaApiService.getFacebookPage('me', longLivedToken.access_token);
        
        req.user.metaTokens.facebookAccessToken = longLivedToken.access_token;
        req.user.metaTokens.facebookTokenExpires = new Date(Date.now() + (longLivedToken.expires_in * 1000));
        req.user.metaTokens.facebookPageId = pageInfo.id;
      }

      req.user.metaTokens.lastTokenRefresh = new Date();
      req.user.metaOAuthState = undefined; // Clear state
      
      await req.user.save();

      logger.audit(`${platform} connected`, req.user._id, {
        platform,
        ip: req.ip
      });

      res.json({
        success: true,
        message: `${platform} connected successfully`,
        data: {
          platform,
          connected: true
        }
      });

    } catch (error) {
      logger.error('Meta callback error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to connect account'
      });
    }
  }

  // Disconnect Meta account
  async disconnectMeta(req, res) {
    try {
      const { platform } = req.params;
      
      if (!['instagram', 'facebook'].includes(platform)) {
        return res.status(400).json({
          success: false,
          message: 'Platform must be instagram or facebook'
        });
      }

      if (platform === 'instagram') {
        req.user.metaTokens.instagramAccessToken = undefined;
        req.user.metaTokens.instagramTokenExpires = undefined;
        req.user.metaTokens.instagramBusinessAccountId = undefined;
      } else {
        req.user.metaTokens.facebookAccessToken = undefined;
        req.user.metaTokens.facebookTokenExpires = undefined;
        req.user.metaTokens.facebookPageId = undefined;
      }

      await req.user.save();

      logger.audit(`${platform} disconnected`, req.user._id, {
        platform,
        ip: req.ip
      });

      res.json({
        success: true,
        message: `${platform} disconnected successfully`
      });

    } catch (error) {
      logger.error('Disconnect Meta error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect account'
      });
    }
  }

  // Get Meta connection status
  async getMetaStatus(req, res) {
    try {
      const user = req.user;
      const now = new Date();

      const status = {
        instagram: {
          connected: !!user.metaTokens.instagramAccessToken,
          expired: user.metaTokens.instagramTokenExpires ? 
            user.metaTokens.instagramTokenExpires < now : false,
          accountId: user.metaTokens.instagramBusinessAccountId,
          expiresAt: user.metaTokens.instagramTokenExpires
        },
        facebook: {
          connected: !!user.metaTokens.facebookAccessToken,
          expired: user.metaTokens.facebookTokenExpires ? 
            user.metaTokens.facebookTokenExpires < now : false,
          pageId: user.metaTokens.facebookPageId,
          expiresAt: user.metaTokens.facebookTokenExpires
        },
        lastRefresh: user.metaTokens.lastTokenRefresh
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Get Meta status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get connection status'
      });
    }
  }
}

module.exports = new AuthController();
