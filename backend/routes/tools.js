const express = require('express');
const router = express.Router();
const {
  getTools,
  getToolById,
  createTool,
  updateTool,
  deleteTool,
  assignTool,
  returnTool,
  addMaintenanceRecord,
  calibrateTool,
  performStockCount,
  adjustInventory,
  getInventoryDiscrepancies,
  getToolStats
} = require('../controllers/toolController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// @route   GET /api/tools/stats
// @desc    Get tool statistics
// @access  Private
router.get('/stats', getToolStats);

// @route   GET /api/tools/inventory-discrepancies
// @desc    Get tools with inventory discrepancies
// @access  Private
router.get('/inventory-discrepancies', getInventoryDiscrepancies);

// @route   GET /api/tools
// @desc    Get all tools
// @access  Private
router.get('/', getTools);

// @route   GET /api/tools/:id
// @desc    Get tool by ID
// @access  Private
router.get('/:id', getToolById);

// @route   POST /api/tools
// @desc    Create new tool
// @access  Private
router.post('/', createTool);

// @route   PUT /api/tools/:id
// @desc    Update tool
// @access  Private
router.put('/:id', updateTool);

// @route   DELETE /api/tools/:id
// @desc    Delete tool
// @access  Private
router.delete('/:id', deleteTool);

// @route   POST /api/tools/:id/assign
// @desc    Assign tool to technician
// @access  Private
router.post('/:id/assign', assignTool);

// @route   POST /api/tools/:id/return
// @desc    Return tool
// @access  Private
router.post('/:id/return', returnTool);

// @route   POST /api/tools/:id/maintenance
// @desc    Add maintenance record
// @access  Private
router.post('/:id/maintenance', addMaintenanceRecord);

// @route   POST /api/tools/:id/calibrate
// @desc    Calibrate tool
// @access  Private
router.post('/:id/calibrate', calibrateTool);

// @route   POST /api/tools/:id/stock-count
// @desc    Perform stock count for a tool
// @access  Private
router.post('/:id/stock-count', performStockCount);

// @route   POST /api/tools/:id/adjust-inventory
// @desc    Adjust tool inventory
// @access  Private
router.post('/:id/adjust-inventory', adjustInventory);

module.exports = router;
