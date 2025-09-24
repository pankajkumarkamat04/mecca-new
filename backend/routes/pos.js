const express = require('express');
const { auth } = require('../middleware/auth');
const {
  openRegister,
  closeRegister,
  createTransaction,
  getRegisterStatus,
  getRegisterSessions,
  getPOSDashboard
} = require('../controllers/posController');

const router = express.Router();

// @route   GET /api/pos/dashboard
// @desc    Get POS dashboard data
// @access  Private
router.get('/dashboard', auth, getPOSDashboard);

// @route   POST /api/pos/transactions
// @desc    Create POS transaction
// @access  Private
router.post('/transactions', auth, createTransaction);

// @route   GET /api/pos/registers/:registerId/status
// @desc    Get register status
// @access  Private
router.get('/registers/:registerId/status', auth, getRegisterStatus);

// @route   GET /api/pos/registers/:registerId/sessions
// @desc    Get register session history
// @access  Private
router.get('/registers/:registerId/sessions', auth, getRegisterSessions);

// @route   POST /api/pos/registers/:registerId/open
// @desc    Open POS register
// @access  Private
router.post('/registers/:registerId/open', auth, openRegister);

// @route   POST /api/pos/registers/:registerId/close
// @desc    Close POS register
// @access  Private
router.post('/registers/:registerId/close', auth, closeRegister);

module.exports = router;
