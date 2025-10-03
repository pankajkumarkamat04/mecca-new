const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addLocation,
  updateLocation,
  removeLocation,
  getWarehouseStats,
  getWarehouseInventory,
  updateWarehouseInventory,
  transferProducts,
  assignManager,
  addEmployee,
  removeEmployee,
  getWarehouseEmployees,
  getAvailableUsers,
  getWarehouseDashboard,
  getWarehouseOrders
} = require('../controllers/warehouseController');
const {
  getWarehousesValidation,
  createWarehouseValidation,
  updateWarehouseValidation,
  warehouseIdValidation,
  transferProductsValidation,
  assignManagerValidation,
  addEmployeeValidation,
  removeEmployeeValidation
} = require('../validations/warehouseValidation');
const { validate } = require('../middleware/validation');
const auth = require('../middleware/auth');

// Protected routes
router.get('/', auth.auth, ...validate(getWarehousesValidation), getWarehouses);
router.get('/stats', auth.auth, getWarehouseStats);
router.get('/available-users', auth.auth, auth.authorize('admin', 'manager'), getAvailableUsers);
router.get('/:id', auth.auth, ...validate(warehouseIdValidation), getWarehouseById);
router.get('/:id/inventory', auth.auth, auth.warehouseEmployeeAuth, ...validate(warehouseIdValidation), getWarehouseInventory);
router.put('/:id/inventory/:productId', auth.auth, auth.warehouseEmployeeAuth, ...validate(warehouseIdValidation), updateWarehouseInventory);
router.get('/:id/employees', auth.auth, auth.warehouseManagerAuth, ...validate(warehouseIdValidation), getWarehouseEmployees);
router.get('/:id/dashboard', auth.auth, auth.warehouseAccessAuth, ...validate(warehouseIdValidation), getWarehouseDashboard);
router.get('/:id/orders', auth.auth, auth.warehouseAccessAuth, ...validate(warehouseIdValidation), getWarehouseOrders);
router.post('/', auth.auth, auth.authorize('admin', 'manager'), ...validate(createWarehouseValidation), createWarehouse);
router.put('/:id', auth.auth, auth.authorize('admin', 'manager'), ...validate(updateWarehouseValidation), updateWarehouse);
router.put('/:id/assign-manager', auth.auth, auth.authorize('admin'), ...validate(assignManagerValidation), assignManager);
router.delete('/:id', auth.auth, auth.authorize('admin'), ...validate(warehouseIdValidation), deleteWarehouse);
router.post('/:id/locations', auth.auth, auth.warehouseManagerAuth, ...validate(warehouseIdValidation), addLocation);
router.put('/:id/locations/:locationId', auth.auth, auth.warehouseManagerAuth, ...validate(warehouseIdValidation), updateLocation);
router.delete('/:id/locations/:locationId', auth.auth, auth.warehouseManagerAuth, ...validate(warehouseIdValidation), removeLocation);
router.post('/:id/employees', auth.auth, auth.warehouseAccessAuth, ...validate(addEmployeeValidation), addEmployee);
router.delete('/:id/employees/:employeeId', auth.auth, auth.warehouseAccessAuth, ...validate(removeEmployeeValidation), removeEmployee);
router.post('/transfer', auth.auth, auth.warehouseEmployeeAuth, ...validate(transferProductsValidation), transferProducts);

module.exports = router;
