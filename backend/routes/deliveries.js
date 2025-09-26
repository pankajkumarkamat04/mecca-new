const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  assignDelivery,
  markAsDelivered,
  markAsFailed,
  getDeliveryStats
} = require('../controllers/deliveryController');
const auth = require('../middleware/auth');

// @route   GET /api/deliveries/stats
// @desc    Get delivery statistics
// @access  Private
router.get('/stats', auth.auth, getDeliveryStats);

// @route   GET /api/deliveries
// @desc    Get all deliveries
// @access  Private
router.get('/', auth.auth, getDeliveries);

// @route   GET /api/deliveries/:id
// @desc    Get delivery by ID
// @access  Private
router.get('/:id', auth.auth, getDeliveryById);

// @route   POST /api/deliveries
// @desc    Create new delivery
// @access  Private
router.post('/', auth.auth, createDelivery);

// @route   PUT /api/deliveries/:id
// @desc    Update delivery
// @access  Private
router.put('/:id', auth.auth, updateDelivery);

// @route   PUT /api/deliveries/:id/status
// @desc    Update delivery status
// @access  Private
router.put('/:id/status', auth.auth, updateDeliveryStatus);

// @route   PUT /api/deliveries/:id/assign
// @desc    Assign delivery to driver
// @access  Private
router.put('/:id/assign', auth.auth, assignDelivery);

// @route   POST /api/deliveries/:id/deliver
// @desc    Mark delivery as delivered
// @access  Private
router.post('/:id/deliver', auth.auth, markAsDelivered);

// @route   POST /api/deliveries/:id/fail
// @desc    Mark delivery as failed
// @access  Private
router.post('/:id/fail', auth.auth, markAsFailed);

module.exports = router;
