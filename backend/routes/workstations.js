const express = require('express');
const router = express.Router();
const {
  getWorkStations,
  getWorkStationById,
  createWorkStation,
  updateWorkStation,
  deleteWorkStation,
  bookWorkStation,
  releaseWorkStation,
  scheduleMaintenance,
  getWorkStationStats
} = require('../controllers/workstationController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// @route   GET /api/workstations/stats
// @desc    Get workstation statistics
// @access  Private
router.get('/stats', getWorkStationStats);

// @route   GET /api/workstations
// @desc    Get all workstations
// @access  Private
router.get('/', getWorkStations);

// @route   GET /api/workstations/:id
// @desc    Get workstation by ID
// @access  Private
router.get('/:id', getWorkStationById);

// @route   POST /api/workstations
// @desc    Create new workstation
// @access  Private
router.post('/', createWorkStation);

// @route   PUT /api/workstations/:id
// @desc    Update workstation
// @access  Private
router.put('/:id', updateWorkStation);

// @route   DELETE /api/workstations/:id
// @desc    Delete workstation
// @access  Private
router.delete('/:id', deleteWorkStation);

// @route   POST /api/workstations/:id/book
// @desc    Book workstation for job
// @access  Private
router.post('/:id/book', bookWorkStation);

// @route   POST /api/workstations/:id/release
// @desc    Release workstation
// @access  Private
router.post('/:id/release', releaseWorkStation);

// @route   POST /api/workstations/:id/maintenance
// @desc    Schedule workstation maintenance
// @access  Private
router.post('/:id/maintenance', scheduleMaintenance);

module.exports = router;
