const express = require('express');
const router = express.Router();
const {
  getTechnicians,
  getTechnicianById,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  addSkill,
  addCertification,
  requestLeave,
  updateLeaveStatus,
  assignJob,
  completeJob,
  updatePerformance,
  getTechnicianStats
} = require('../controllers/technicianController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// @route   GET /api/technicians/stats
// @desc    Get technician statistics
// @access  Private
router.get('/stats', getTechnicianStats);

// @route   GET /api/technicians
// @desc    Get all technicians
// @access  Private
router.get('/', getTechnicians);

// @route   GET /api/technicians/:id
// @desc    Get technician by ID
// @access  Private
router.get('/:id', getTechnicianById);

// @route   POST /api/technicians
// @desc    Create new technician
// @access  Private
router.post('/', createTechnician);

// @route   PUT /api/technicians/:id
// @desc    Update technician
// @access  Private
router.put('/:id', updateTechnician);

// @route   DELETE /api/technicians/:id
// @desc    Delete technician
// @access  Private
router.delete('/:id', deleteTechnician);

// @route   POST /api/technicians/:id/skills
// @desc    Add skill to technician
// @access  Private
router.post('/:id/skills', addSkill);

// @route   POST /api/technicians/:id/certifications
// @desc    Add certification to technician
// @access  Private
router.post('/:id/certifications', addCertification);

// @route   POST /api/technicians/:id/leave
// @desc    Request leave
// @access  Private
router.post('/:id/leave', requestLeave);

// @route   PUT /api/technicians/:id/leave/:leaveId
// @desc    Approve/Reject leave
// @access  Private
router.put('/:id/leave/:leaveId', updateLeaveStatus);

// @route   POST /api/technicians/:id/assign-job
// @desc    Assign job to technician
// @access  Private
router.post('/:id/assign-job', assignJob);

// @route   POST /api/technicians/:id/complete-job
// @desc    Complete job for technician
// @access  Private
router.post('/:id/complete-job', completeJob);

// @route   POST /api/technicians/:id/performance
// @desc    Update technician performance
// @access  Private
router.post('/:id/performance', updatePerformance);

module.exports = router;
