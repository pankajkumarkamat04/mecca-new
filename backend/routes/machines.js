const express = require('express');
const router = express.Router();
const {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  bookMachine,
  releaseMachine,
  addMaintenanceRecord,
  getMachineStats
} = require('../controllers/machineController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// @route   GET /api/machines/stats
// @desc    Get machine statistics
// @access  Private
router.get('/stats', getMachineStats);

// @route   GET /api/machines
// @desc    Get all machines
// @access  Private
router.get('/', getMachines);

// @route   GET /api/machines/:id
// @desc    Get machine by ID
// @access  Private
router.get('/:id', getMachineById);

// @route   POST /api/machines
// @desc    Create new machine
// @access  Private
router.post('/', createMachine);

// @route   PUT /api/machines/:id
// @desc    Update machine
// @access  Private
router.put('/:id', updateMachine);

// @route   DELETE /api/machines/:id
// @desc    Delete machine
// @access  Private
router.delete('/:id', deleteMachine);

// @route   POST /api/machines/:id/book
// @desc    Book machine for job
// @access  Private
router.post('/:id/book', bookMachine);

// @route   POST /api/machines/:id/release
// @desc    Release machine
// @access  Private
router.post('/:id/release', releaseMachine);

// @route   POST /api/machines/:id/maintenance
// @desc    Add maintenance record
// @access  Private
router.post('/:id/maintenance', addMaintenanceRecord);

module.exports = router;
