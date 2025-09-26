const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  updatePaymentStatus,
  assignOrder,
  convertToInvoice,
  getOrderStats,
  getOrdersByCustomer,
  generatePickingList,
  checkInventoryAvailability
} = require('../controllers/orderController');
const {
  createOrderValidation,
  updateOrderValidation,
  updateOrderStatusValidation,
  updatePaymentStatusValidation,
  assignOrderValidation,
  getOrdersValidation,
  orderIdValidation,
  customerIdValidation
} = require('../validations/orderValidation');
const { validate } = require('../middleware/validation');
const auth = require('../middleware/auth');

// Protected routes
router.get('/', auth.auth, ...validate(getOrdersValidation), getOrders);
router.get('/stats', auth.auth, getOrderStats);
router.get('/customer/:customerId', auth.auth, ...validate(customerIdValidation), getOrdersByCustomer);
router.get('/:id', auth.auth, ...validate(orderIdValidation), getOrderById);
router.post('/', auth.auth, ...validate(createOrderValidation), createOrder);
router.put('/:id', auth.auth, ...validate(updateOrderValidation), updateOrder);
router.delete('/:id', auth.auth, ...validate(orderIdValidation), deleteOrder);
router.put('/:id/status', auth.auth, ...validate(updateOrderStatusValidation), updateOrderStatus);
router.put('/:id/payment', auth.auth, ...validate(updatePaymentStatusValidation), updatePaymentStatus);
router.put('/:id/assign', auth.auth, ...validate(assignOrderValidation), assignOrder);
router.post('/:id/convert-to-invoice', auth.auth, ...validate(orderIdValidation), convertToInvoice);
router.post('/check-inventory', auth.auth, checkInventoryAvailability);
router.post('/:id/generate-picking-list', auth.auth, ...validate(orderIdValidation), generatePickingList);

module.exports = router;
