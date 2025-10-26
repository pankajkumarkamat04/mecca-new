const express = require('express');
const { auth, checkPermission } = require('../middleware/auth');
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  scheduleJob,
  updateJobProgress,
  completeJob,
  cancelJob,
  deleteJob,
  assignTechnician,
  removeTechnician,
  addTask,
  updateTaskStatus,
  bookMachine,
  releaseMachine,
  bookWorkStation,
  assignTool,
  assignResources,
  checkPartsAvailability,
  reserveParts,
  getAvailableResources,
  getJobStats,
  getCustomerJobs,
  updateJobCard,
  addCustomerComment,
  addStatusUpdate,
  checkResourceConflicts,
  getJobAnalytics,
  getWorkshopDashboard,
  getAvailableTechnicians,
  returnTool,
  getAvailableTools,
  getAvailableMachines,
  updateJobResources,
  updateJobTask,
  getJobVisualization,
  applyServiceTemplate
} = require('../controllers/workshopController');

const router = express.Router();

// Statistics and customer portal (must come before /:id routes)
router.get('/stats', auth, getJobStats);
router.get('/dashboard', auth, getWorkshopDashboard);
router.put('/:id/update-resources', auth, checkPermission('workshop', 'update'), updateJobResources);
router.put('/:id/update-task', auth, checkPermission('workshop', 'update'), updateJobTask);
router.get('/available-technicians', auth, getAvailableTechnicians);
router.get('/available-tools', auth, getAvailableTools);
router.get('/available-machines', auth, getAvailableMachines);
router.get('/:id/visualization', auth, getJobVisualization);
router.get('/customer/:customerId', auth, getCustomerJobs);

// Basic CRUD operations
router.get('/', auth, getJobs);
router.post('/', auth, checkPermission('workshop', 'create'), createJob);
router.get('/:id', auth, getJobById);
router.put('/:id', auth, checkPermission('workshop', 'update'), updateJob);
router.delete('/:id', auth, checkPermission('workshop', 'delete'), deleteJob);
router.put('/:id/schedule', auth, checkPermission('workshop', 'update'), scheduleJob);
router.put('/:id/progress', auth, checkPermission('workshop', 'update'), updateJobProgress);
router.post('/:id/complete', auth, checkPermission('workshop', 'update'), completeJob);
router.put('/:id/cancel', auth, checkPermission('workshop', 'update'), cancelJob);

// Resource management
router.put('/:id/assign-technician', auth, checkPermission('workshop', 'update'), assignTechnician);
router.put('/:id/remove-technician', auth, checkPermission('workshop', 'update'), removeTechnician);
router.post('/:id/book-machine', auth, checkPermission('workshop', 'update'), bookMachine);
router.post('/:id/release-machine', auth, checkPermission('workshop', 'update'), releaseMachine);
router.post('/:id/book-workstation', auth, checkPermission('workshop', 'update'), bookWorkStation);
router.post('/:id/assign-tool', auth, checkPermission('workshop', 'update'), assignTool);
router.post('/:id/return-tool', auth, checkPermission('workshop', 'update'), returnTool);
router.post('/:id/assign-resources', auth, checkPermission('workshop', 'update'), assignResources);

// Task management
router.post('/:id/tasks', auth, checkPermission('workshop', 'update'), addTask);
router.put('/:id/tasks/:taskId', auth, checkPermission('workshop', 'update'), updateTaskStatus);

// Inventory management
router.get('/:id/check-parts', auth, checkPartsAvailability);
router.post('/:id/reserve-parts', auth, checkPermission('workshop', 'update'), reserveParts);

// Resource availability
router.get('/:id/available-resources', auth, getAvailableResources);

// Enhanced job card management
router.put('/:id/job-card', auth, checkPermission('workshop', 'update'), updateJobCard);
router.post('/:id/customer-comment', auth, addCustomerComment);
router.post('/:id/status-update', auth, checkPermission('workshop', 'update'), addStatusUpdate);
router.post('/:id/apply-template', auth, checkPermission('workshop', 'update'), applyServiceTemplate);

// Resource conflict detection
router.get('/:id/check-conflicts', auth, checkResourceConflicts);

// Analytics and insights
router.get('/:id/analytics', auth, getJobAnalytics);

// Workflow updates
router.put('/:id/quality-check', auth, checkPermission('workshop', 'update'), require('../controllers/workshopController').markQualityCheck);
router.put('/:id/follow-up', auth, checkPermission('workshop', 'update'), require('../controllers/workshopController').markFollowUp);

module.exports = router;


