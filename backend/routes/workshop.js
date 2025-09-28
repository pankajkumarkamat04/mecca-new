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
  assignTechnician,
  removeTechnician,
  addTask,
  updateTaskStatus,
  bookMachine,
  bookWorkStation,
  assignTool,
  checkPartsAvailability,
  reserveParts,
  getAvailableResources,
  getJobStats,
  getCustomerJobs
} = require('../controllers/workshopController');

const router = express.Router();

// Basic CRUD operations
router.get('/', auth, getJobs);
router.post('/', auth, checkPermission('workshop', 'create'), createJob);
router.get('/:id', auth, getJobById);
router.put('/:id', auth, checkPermission('workshop', 'update'), updateJob);
router.put('/:id/schedule', auth, checkPermission('workshop', 'update'), scheduleJob);
router.put('/:id/progress', auth, checkPermission('workshop', 'update'), updateJobProgress);
router.post('/:id/complete', auth, checkPermission('workshop', 'update'), completeJob);
router.put('/:id/cancel', auth, checkPermission('workshop', 'update'), cancelJob);

// Resource management
router.put('/:id/assign-technician', auth, checkPermission('workshop', 'update'), assignTechnician);
router.put('/:id/remove-technician', auth, checkPermission('workshop', 'update'), removeTechnician);
router.post('/:id/book-machine', auth, checkPermission('workshop', 'update'), bookMachine);
router.post('/:id/book-workstation', auth, checkPermission('workshop', 'update'), bookWorkStation);
router.post('/:id/assign-tool', auth, checkPermission('workshop', 'update'), assignTool);

// Task management
router.post('/:id/tasks', auth, checkPermission('workshop', 'update'), addTask);
router.put('/:id/tasks/:taskId', auth, checkPermission('workshop', 'update'), updateTaskStatus);

// Inventory management
router.get('/:id/check-parts', auth, checkPartsAvailability);
router.post('/:id/reserve-parts', auth, checkPermission('workshop', 'update'), reserveParts);

// Resource availability
router.get('/:id/available-resources', auth, getAvailableResources);

// Statistics and customer portal
router.get('/stats', auth, getJobStats);
router.get('/customer/:customerId', auth, getCustomerJobs);

module.exports = router;


