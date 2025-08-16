const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors,
  sanitizeInput
} = require('../middleware/validation');

// Register new user
router.post('/register',
  sanitizeInput,
  validateRegistration,
  handleValidationErrors,
  authController.register
);

// Login user
router.post('/login',
  sanitizeInput,
  validateLogin,
  handleValidationErrors,
  authController.login
);

// Get current user details
router.get('/me',
  authenticateToken,
  authController.getCurrentUser
);

// Update user profile
router.put('/profile',
  authenticateToken,
  sanitizeInput,
  validateUpdateProfile,
  handleValidationErrors,
  authController.updateProfile
);

// Change password
router.put('/change-password',
  authenticateToken,
  validateChangePassword,
  handleValidationErrors,
  authController.changePassword
);

// Forgot password
router.post('/forgot-password',
  validateForgotPassword,
  handleValidationErrors,
  authController.forgotPassword
);

// Reset password
router.post('/reset-password',
  validateResetPassword,
  handleValidationErrors,
  authController.resetPassword
);

module.exports = router;