const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');
const { createUserValidation, updateUserValidation, updateProfileValidation } = require('../validations/userValidation');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  getUserStats
} = require('../controllers/userController');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin/Manager)
router.get('/', auth, authorize('admin', 'manager'), validatePagination(), getUsers);

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin/Manager/Warehouse Manager)
router.post('/', auth, authorize('admin', 'manager', 'warehouse_manager'), validate(createUserValidation), createUser);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, ...validate(updateProfileValidation), updateUserProfile);

// @route   GET /api/users/:id/stats
// @desc    Get user statistics
// @access  Private
router.get('/:id/stats', auth, validateObjectId(), getUserStats);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, validateObjectId(), getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', auth, validateObjectId(), ...validate(updateUserValidation), updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), validateObjectId(), deleteUser);

module.exports = router;
