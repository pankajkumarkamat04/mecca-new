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
  getToolStats
} = require('../controllers/toolController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// @route   GET /api/tools/stats
// @desc    Get tool statistics
// @access  Private
router.get('/stats', getToolStats);

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

module.exports = router;
