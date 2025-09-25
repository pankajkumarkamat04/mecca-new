const express = require('express');
const router = express.Router();
const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  sendPurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderStats
} = require('../controllers/purchaseOrderController');
const {
  createPurchaseOrderValidation,
  updatePurchaseOrderValidation,
  purchaseOrderIdValidation,
  receivePurchaseOrderValidation,
  getPurchaseOrdersValidation
} = require('../validations/purchaseOrderValidation');
const { validate } = require('../middleware/validation');
const auth = require('../middleware/auth');

// Protected routes
router.get('/', auth.auth, ...validate(getPurchaseOrdersValidation), getPurchaseOrders);
router.get('/stats', auth.auth, getPurchaseOrderStats);
router.get('/:id', auth.auth, ...validate(purchaseOrderIdValidation), getPurchaseOrderById);
router.post('/', auth.auth, ...validate(createPurchaseOrderValidation), createPurchaseOrder);
router.put('/:id', auth.auth, ...validate(updatePurchaseOrderValidation), updatePurchaseOrder);
router.delete('/:id', auth.auth, ...validate(purchaseOrderIdValidation), deletePurchaseOrder);
router.post('/:id/send', auth.auth, ...validate(purchaseOrderIdValidation), sendPurchaseOrder);
router.post('/:id/confirm', auth.auth, ...validate(purchaseOrderIdValidation), confirmPurchaseOrder);
router.post('/:id/receive', auth.auth, ...validate(receivePurchaseOrderValidation), receivePurchaseOrder);
router.post('/:id/cancel', auth.auth, ...validate(purchaseOrderIdValidation), cancelPurchaseOrder);

module.exports = router;
