const ServiceTemplate = require('../models/ServiceTemplate');

// @desc    Create service template
// @route   POST /api/service-templates
// @access  Private
const createServiceTemplate = async (req, res) => {
  try {
    const serviceData = {
      ...req.body,
      createdBy: req.user._id
    };

    const serviceTemplate = new ServiceTemplate(serviceData);
    await serviceTemplate.save();

    res.status(201).json({
      success: true,
      message: 'Service template created successfully',
      data: serviceTemplate
    });
  } catch (error) {
    console.error('Create service template error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all service templates
// @route   GET /api/service-templates
// @access  Private
const getServiceTemplates = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [serviceTemplates, totalCount] = await Promise.all([
      ServiceTemplate.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('lastUpdatedBy', 'firstName lastName')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ServiceTemplate.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        serviceTemplates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get service templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get service template by ID
// @route   GET /api/service-templates/:id
// @access  Private
const getServiceTemplateById = async (req, res) => {
  try {
    const serviceTemplate = await ServiceTemplate.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    if (!serviceTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Service template not found'
      });
    }

    res.json({
      success: true,
      data: serviceTemplate
    });
  } catch (error) {
    console.error('Get service template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update service template
// @route   PUT /api/service-templates/:id
// @access  Private
const updateServiceTemplate = async (req, res) => {
  try {
    const serviceTemplate = await ServiceTemplate.findById(req.params.id);

    if (!serviceTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Service template not found'
      });
    }

    Object.assign(serviceTemplate, req.body);
    serviceTemplate.lastUpdatedBy = req.user._id;
    await serviceTemplate.save();

    res.json({
      success: true,
      message: 'Service template updated successfully',
      data: serviceTemplate
    });
  } catch (error) {
    console.error('Update service template error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete service template
// @route   DELETE /api/service-templates/:id
// @access  Private
const deleteServiceTemplate = async (req, res) => {
  try {
    const serviceTemplate = await ServiceTemplate.findById(req.params.id);

    if (!serviceTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Service template not found'
      });
    }

    // Soft delete by setting isActive to false
    serviceTemplate.isActive = false;
    serviceTemplate.lastUpdatedBy = req.user._id;
    await serviceTemplate.save();

    res.json({
      success: true,
      message: 'Service template deleted successfully'
    });
  } catch (error) {
    console.error('Delete service template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get service templates by category
// @route   GET /api/service-templates/category/:category
// @access  Private
const getServiceTemplatesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const serviceTemplates = await ServiceTemplate.getByCategory(category);

    res.json({
      success: true,
      data: serviceTemplates
    });
  } catch (error) {
    console.error('Get service templates by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Search service templates
// @route   GET /api/service-templates/search/:query
// @access  Private
const searchServiceTemplates = async (req, res) => {
  try {
    const { query } = req.params;
    const serviceTemplates = await ServiceTemplate.searchServices(query);

    res.json({
      success: true,
      data: serviceTemplates
    });
  } catch (error) {
    console.error('Search service templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createServiceTemplate,
  getServiceTemplates,
  getServiceTemplateById,
  updateServiceTemplate,
  deleteServiceTemplate,
  getServiceTemplatesByCategory,
  searchServiceTemplates
};
