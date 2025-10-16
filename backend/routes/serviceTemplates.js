const express = require('express');
const router = express.Router();
const {
  createServiceTemplate,
  getServiceTemplates,
  getServiceTemplateById,
  updateServiceTemplate,
  deleteServiceTemplate,
  getServiceTemplatesByCategory,
  searchServiceTemplates
} = require('../controllers/serviceTemplateController');
const { auth, authorize } = require('../middleware/auth');

// @route   POST /api/service-templates
// @desc    Create service template
// @access  Private (Admin, Manager, Workshop Employee)
router.post('/', auth, authorize('admin', 'manager', 'workshop_employee'), createServiceTemplate);

// @route   GET /api/service-templates
// @desc    Get all service templates
// @access  Private (Admin, Manager, Workshop Employee)
router.get('/', auth, authorize('admin', 'manager', 'workshop_employee'), getServiceTemplates);

// @route   GET /api/service-templates/:id
// @desc    Get service template by ID
// @access  Private (Admin, Manager, Workshop Employee)
router.get('/:id', auth, authorize('admin', 'manager', 'workshop_employee'), getServiceTemplateById);

// @route   PUT /api/service-templates/:id
// @desc    Update service template
// @access  Private (Admin, Manager, Workshop Employee)
router.put('/:id', auth, authorize('admin', 'manager', 'workshop_employee'), updateServiceTemplate);

// @route   DELETE /api/service-templates/:id
// @desc    Delete service template
// @access  Private (Admin, Manager)
router.delete('/:id', auth, authorize('admin', 'manager'), deleteServiceTemplate);

// @route   GET /api/service-templates/category/:category
// @desc    Get service templates by category
// @access  Private (Admin, Manager, Workshop Employee)
router.get('/category/:category', auth, authorize('admin', 'manager', 'workshop_employee'), getServiceTemplatesByCategory);

// @route   GET /api/service-templates/search/:query
// @desc    Search service templates
// @access  Private (Admin, Manager, Workshop Employee)
router.get('/search/:query', auth, authorize('admin', 'manager', 'workshop_employee'), searchServiceTemplates);

module.exports = router;
