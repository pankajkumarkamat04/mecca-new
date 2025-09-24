const express = require('express');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  register,
  login,
  getMe,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  logout
} = require('../controllers/authController');
const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../validations/authValidation');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', validate(registerValidation), register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validate(loginValidation), login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, getMe);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', auth, refreshToken);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, logout);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, validate(changePasswordValidation), changePassword);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', validate(forgotPasswordValidation), forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', validate(resetPasswordValidation), resetPassword);

module.exports = router;
