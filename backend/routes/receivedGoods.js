const express = require('express');
const router = express.Router();
const {
  createReceivedGoods,
  getReceivedGoods,
  getReceivedGoodsById,
  updateReceivedGoods,
  receiveItems,
  addToInventory,
  deleteReceivedGoods,
  getReceivedGoodsStats
} = require('../controllers/receivedGoodsController');
const { auth, authorize } = require('../middleware/auth');
const receivedGoodsValidation = require('../validations/receivedGoodsValidation');

// @route   POST /api/received-goods
// @desc    Create received goods
// @access  Private (Admin, Manager, Warehouse Manager)
router.post('/', 
  auth, 
  authorize('admin', 'manager', 'warehouse_manager'), 
  receivedGoodsValidation.createReceivedGoods,
  createReceivedGoods
);

// @route   GET /api/received-goods
// @desc    Get all received goods
// @access  Private (Admin, Manager, Warehouse Manager, Warehouse Employee)
router.get('/', 
  auth, 
  authorize('admin', 'manager', 'warehouse_manager', 'warehouse_employee'), 
  getReceivedGoods
);

// @route   GET /api/received-goods/stats
// @desc    Get received goods statistics
// @access  Private (Admin, Manager, Warehouse Manager)
router.get('/stats', 
  auth, 
  authorize('admin', 'manager', 'warehouse_manager'), 
  getReceivedGoodsStats
);

// @route   GET /api/received-goods/:id
// @desc    Get received goods by ID
// @access  Private (Admin, Manager, Warehouse Manager, Warehouse Employee)
router.get('/:id', 
  auth, 
  authorize('admin', 'manager', 'warehouse_manager', 'warehouse_employee'), 
  getReceivedGoodsById
);

// @route   PUT /api/received-goods/:id
// @desc    Update received goods
// @access  Private (Admin, Manager, Warehouse Manager)
router.put('/:id', 
  auth, 
  authorize('admin', 'manager', 'warehouse_manager'), 
  receivedGoodsValidation.updateReceivedGoods,
  updateReceivedGoods
);

// @route   POST /api/received-goods/:id/receive
// @desc    Receive items (update received quantities)
// @access  Private (Admin, Manager, Warehouse Manager, Warehouse Employee)
router.post('/:id/receive', 
  auth, 
  authorize('admin', 'manager', 'warehouse_manager', 'warehouse_employee'), 
  receivedGoodsValidation.receiveItems,
  receiveItems
);

// @route   POST /api/received-goods/:id/add-to-inventory
// @desc    Add received goods to inventory
// @access  Private (Admin, Manager, Warehouse Manager)
router.post('/:id/add-to-inventory', 
  auth, 
  authorize('admin', 'manager', 'warehouse_manager'), 
  addToInventory
);

// @route   DELETE /api/received-goods/:id
// @desc    Delete received goods
// @access  Private (Admin, Manager)
router.delete('/:id', 
  auth, 
  authorize('admin', 'manager'), 
  deleteReceivedGoods
);

module.exports = router;
