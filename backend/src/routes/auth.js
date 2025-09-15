const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { auth, refreshTokenIfNeeded } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Public routes
router.post('/register', registerValidation, asyncHandler(authController.register));
router.post('/login', refreshTokenIfNeeded, loginValidation, asyncHandler(authController.login));
router.post('/refresh-token', asyncHandler(authController.refreshToken));
router.post('/forgot-password', forgotPasswordValidation, asyncHandler(authController.forgotPassword));
router.post('/reset-password', resetPasswordValidation, asyncHandler(authController.resetPassword));
router.get('/verify-email/:token', asyncHandler(authController.verifyEmail));
router.post('/resend-verification', forgotPasswordValidation, asyncHandler(authController.resendVerification));

// Protected routes
router.post('/logout', auth, asyncHandler(authController.logout));
router.post('/logout-all', auth, asyncHandler(authController.logoutAll));
router.post('/change-password', auth, changePasswordValidation, asyncHandler(authController.changePassword));
router.get('/me', auth, asyncHandler(authController.getProfile));
router.patch('/me', auth, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('timezone').optional().isString(),
  body('language').optional().isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'hi'])
], asyncHandler(authController.updateProfile));

// Meta OAuth routes
router.get('/meta/connect', auth, asyncHandler(authController.getMetaAuthUrl));
router.post('/meta/callback', auth, [
  body('code').notEmpty().withMessage('Authorization code is required'),
  body('platform').isIn(['instagram', 'facebook']).withMessage('Platform must be instagram or facebook')
], asyncHandler(authController.handleMetaCallback));
router.delete('/meta/disconnect/:platform', auth, asyncHandler(authController.disconnectMeta));
router.get('/meta/status', auth, asyncHandler(authController.getMetaStatus));

// Security routes
router.get('/sessions', auth, asyncHandler(authController.getActiveSessions));
router.delete('/sessions/:sessionId', auth, asyncHandler(authController.revokeSession));
router.get('/login-history', auth, asyncHandler(authController.getLoginHistory));

module.exports = router;
