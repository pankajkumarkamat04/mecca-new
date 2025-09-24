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
} = require('../controllers/workshopController');

const router = express.Router();

router.get('/', auth, getJobs);
router.post('/', auth, checkPermission('workshop', 'create'), createJob);
router.get('/:id', auth, getJobById);
router.put('/:id', auth, checkPermission('workshop', 'update'), updateJob);
router.put('/:id/schedule', auth, checkPermission('workshop', 'update'), scheduleJob);
router.put('/:id/progress', auth, checkPermission('workshop', 'update'), updateJobProgress);
router.post('/:id/complete', auth, checkPermission('workshop', 'update'), completeJob);
router.put('/:id/cancel', auth, checkPermission('workshop', 'update'), cancelJob);

module.exports = router;


