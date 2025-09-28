const Tool = require('../models/Tool');

// @desc    Get all tools
// @route   GET /api/tools
// @access  Private
const getTools = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category = '', 
      status = '',
      available = ''
    } = req.query;

    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { toolNumber: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (available === 'true') query['availability.isAvailable'] = true;
    if (available === 'false') query['availability.isAvailable'] = false;

    const tools = await Tool.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('availability.currentJob', 'title status')
      .populate('availability.assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Tool.countDocuments(query);

    res.json({
      success: true,
      data: {
        tools,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get tools error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get tool by ID
// @route   GET /api/tools/:id
// @access  Private
const getToolById = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('availability.currentJob', 'title status customer')
      .populate('availability.assignedTo', 'firstName lastName')
      .populate('maintenance.maintenanceHistory.performedBy', 'firstName lastName');

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    res.json({
      success: true,
      data: tool
    });
  } catch (error) {
    console.error('Get tool by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new tool
// @route   POST /api/tools
// @access  Private
const createTool = async (req, res) => {
  try {
    const toolData = {
      ...req.body,
      createdBy: req.user._id
    };

    const tool = new Tool(toolData);
    await tool.save();

    const populatedTool = await Tool.findById(tool._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Tool created successfully',
      data: populatedTool
    });
  } catch (error) {
    console.error('Create tool error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tool with this tool number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update tool
// @route   PUT /api/tools/:id
// @access  Private
const updateTool = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    Object.assign(tool, req.body);
    tool.lastUpdatedBy = req.user._id;
    await tool.save();

    const updatedTool = await Tool.findById(tool._id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Tool updated successfully',
      data: updatedTool
    });
  } catch (error) {
    console.error('Update tool error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tool with this tool number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete tool
// @route   DELETE /api/tools/:id
// @access  Private
const deleteTool = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    tool.isActive = false;
    tool.lastUpdatedBy = req.user._id;
    await tool.save();

    res.json({
      success: true,
      message: 'Tool deleted successfully'
    });
  } catch (error) {
    console.error('Delete tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Assign tool
// @route   POST /api/tools/:id/assign
// @access  Private
const assignTool = async (req, res) => {
  try {
    const { jobId, expectedReturn } = req.body;
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    if (!tool.availability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Tool is not available'
      });
    }

    tool.assignTool(jobId, req.user._id, new Date(expectedReturn));
    tool.lastUpdatedBy = req.user._id;
    await tool.save();

    const updatedTool = await Tool.findById(tool._id)
      .populate('availability.currentJob', 'title status')
      .populate('availability.assignedTo', 'firstName lastName');

    res.json({
      success: true,
      message: 'Tool assigned successfully',
      data: updatedTool
    });
  } catch (error) {
    console.error('Assign tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Return tool
// @route   POST /api/tools/:id/return
// @access  Private
const returnTool = async (req, res) => {
  try {
    const { condition } = req.body;
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    tool.returnTool(condition);
    tool.lastUpdatedBy = req.user._id;
    await tool.save();

    const updatedTool = await Tool.findById(tool._id);

    res.json({
      success: true,
      message: 'Tool returned successfully',
      data: updatedTool
    });
  } catch (error) {
    console.error('Return tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add maintenance record
// @route   POST /api/tools/:id/maintenance
// @access  Private
const addMaintenanceRecord = async (req, res) => {
  try {
    const { type, description, cost, notes } = req.body;
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    tool.addMaintenanceRecord(type, description, req.user._id, cost, notes);
    tool.lastUpdatedBy = req.user._id;
    await tool.save();

    const updatedTool = await Tool.findById(tool._id)
      .populate('maintenance.maintenanceHistory.performedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Maintenance record added successfully',
      data: updatedTool
    });
  } catch (error) {
    console.error('Add maintenance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Calibrate tool
// @route   POST /api/tools/:id/calibrate
// @access  Private
const calibrateTool = async (req, res) => {
  try {
    const { calibrationDate, certificate } = req.body;
    const tool = await Tool.findById(req.params.id);

    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    if (!tool.calibration.requiresCalibration) {
      return res.status(400).json({
        success: false,
        message: 'This tool does not require calibration'
      });
    }

    tool.calibrate(calibrationDate ? new Date(calibrationDate) : undefined, certificate);
    tool.lastUpdatedBy = req.user._id;
    await tool.save();

    const updatedTool = await Tool.findById(tool._id);

    res.json({
      success: true,
      message: 'Tool calibrated successfully',
      data: updatedTool
    });
  } catch (error) {
    console.error('Calibrate tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get tool statistics
// @route   GET /api/tools/stats
// @access  Private
const getToolStats = async (req, res) => {
  try {
    const totalTools = await Tool.countDocuments({ isActive: true });
    const availableTools = await Tool.countDocuments({ 
      'availability.isAvailable': true, 
      isActive: true 
    });
    const inUseTools = await Tool.countDocuments({ 
      status: 'in_use', 
      isActive: true 
    });
    const maintenanceTools = await Tool.countDocuments({ 
      status: 'maintenance', 
      isActive: true 
    });
    const overdueMaintenance = await Tool.countDocuments({ 
      'maintenance.nextMaintenance': { $lt: new Date() },
      isActive: true 
    });
    const overdueCalibration = await Tool.countDocuments({ 
      'calibration.nextCalibration': { $lt: new Date() },
      'calibration.requiresCalibration': true,
      isActive: true 
    });

    // Get tools by category
    const categoryStats = await Tool.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get tools by condition
    const conditionStats = await Tool.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$condition', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalTools,
        available: availableTools,
        inUse: inUseTools,
        maintenance: maintenanceTools,
        overdueMaintenance,
        overdueCalibration,
        byCategory: categoryStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byCondition: conditionStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get tool stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getTools,
  getToolById,
  createTool,
  updateTool,
  deleteTool,
  assignTool,
  returnTool,
  addMaintenanceRecord,
  calibrateTool,
  getToolStats
};
