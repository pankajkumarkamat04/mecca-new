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
  transferProducts
} = require('../controllers/warehouseController');
const {
  getWarehousesValidation,
  createWarehouseValidation,
  updateWarehouseValidation,
  warehouseIdValidation,
  transferProductsValidation
} = require('../validations/warehouseValidation');
const { validate } = require('../middleware/validation');
const auth = require('../middleware/auth');

// Protected routes
router.get('/', auth.auth, ...validate(getWarehousesValidation), getWarehouses);
router.get('/stats', auth.auth, getWarehouseStats);
router.get('/:id', auth.auth, ...validate(warehouseIdValidation), getWarehouseById);
router.get('/:id/inventory', auth.auth, ...validate(warehouseIdValidation), getWarehouseInventory);
router.post('/', auth.auth, ...validate(createWarehouseValidation), createWarehouse);
router.put('/:id', auth.auth, ...validate(updateWarehouseValidation), updateWarehouse);
router.delete('/:id', auth.auth, ...validate(warehouseIdValidation), deleteWarehouse);
router.post('/:id/locations', auth.auth, ...validate(warehouseIdValidation), addLocation);
router.put('/:id/locations/:locationId', auth.auth, ...validate(warehouseIdValidation), updateLocation);
router.delete('/:id/locations/:locationId', auth.auth, ...validate(warehouseIdValidation), removeLocation);
router.post('/transfer', auth.auth, ...validate(transferProductsValidation), transferProducts);

module.exports = router;
