const express = require('express');
const router = express.Router();
const {
  getReceivedGoods,
  getReceivedGoodsById,
  createReceivedGoods,
  approveReceivedGoods,
  inspectReceivedGoods,
  getReceivedGoodsStats,
  resolveDiscrepancy,
  performQualityInspection
} = require('../controllers/receivedGoodsController');
const {
  createReceivedGoodsValidation,
  inspectReceivedGoodsValidation,
  approveReceivedGoodsValidation,
  getReceivedGoodsValidation
} = require('../validations/receivedGoodsValidation');
const { validate } = require('../middleware/validation');
const auth = require('../middleware/auth');

// Protected routes
router.get('/', auth.auth, ...validate(getReceivedGoodsValidation), getReceivedGoods);
router.get('/stats', auth.auth, getReceivedGoodsStats);
router.get('/:id', auth.auth, ...validate(getReceivedGoodsValidation), getReceivedGoodsById);
router.post('/', auth.auth, ...validate(createReceivedGoodsValidation), createReceivedGoods);
router.post('/:id/inspect', auth.auth, ...validate(inspectReceivedGoodsValidation), inspectReceivedGoods);
router.post('/:id/approve', auth.auth, ...validate(approveReceivedGoodsValidation), approveReceivedGoods);
router.post('/:id/resolve-discrepancy', auth.auth, resolveDiscrepancy);
router.post('/:id/quality-inspection', auth.auth, performQualityInspection);

module.exports = router;