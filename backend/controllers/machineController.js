const Machine = require('../models/Machine');

// @desc    Get all machines
// @route   GET /api/machines
// @access  Private
const getMachines = async (req, res) => {
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
        { model: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (available === 'true') query['availability.isAvailable'] = true;
    if (available === 'false') query['availability.isAvailable'] = false;

    const machines = await Machine.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('availability.currentJob', 'title status')
      .populate('availability.bookedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Machine.countDocuments(query);

    res.json({
      success: true,
      data: {
        machines,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get machines error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get machine by ID
// @route   GET /api/machines/:id
// @access  Private
const getMachineById = async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('availability.currentJob', 'title status customer')
      .populate('availability.bookedBy', 'firstName lastName')
      .populate('maintenance.maintenanceHistory.performedBy', 'firstName lastName');

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    res.json({
      success: true,
      data: machine
    });
  } catch (error) {
    console.error('Get machine by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new machine
// @route   POST /api/machines
// @access  Private
const createMachine = async (req, res) => {
  try {
    // Clean up the request body to handle empty ObjectId fields
    const cleanedData = { ...req.body };
    
    // Handle availability fields - remove if empty strings or null
    if (cleanedData.availability) {
      if (cleanedData.availability.currentJob === '' || cleanedData.availability.currentJob === null) {
        delete cleanedData.availability.currentJob;
      }
      if (cleanedData.availability.bookedBy === '' || cleanedData.availability.bookedBy === null) {
        delete cleanedData.availability.bookedBy;
      }
      if (cleanedData.availability.bookedUntil === '' || cleanedData.availability.bookedUntil === null) {
        delete cleanedData.availability.bookedUntil;
      }
    }

    const machineData = {
      ...cleanedData,
      createdBy: req.user._id
    };

    const machine = new Machine(machineData);
    await machine.save();

    const populatedMachine = await Machine.findById(machine._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Machine created successfully',
      data: populatedMachine
    });
  } catch (error) {
    console.error('Create machine error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Machine with this serial number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update machine
// @route   PUT /api/machines/:id
// @access  Private
const updateMachine = async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    Object.assign(machine, req.body);
    machine.lastUpdatedBy = req.user._id;
    await machine.save();

    const updatedMachine = await Machine.findById(machine._id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Machine updated successfully',
      data: updatedMachine
    });
  } catch (error) {
    console.error('Update machine error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Machine with this serial number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete machine
// @route   DELETE /api/machines/:id
// @access  Private
const deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    machine.isActive = false;
    machine.lastUpdatedBy = req.user._id;
    await machine.save();

    res.json({
      success: true,
      message: 'Machine deleted successfully'
    });
  } catch (error) {
    console.error('Delete machine error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Book machine
// @route   POST /api/machines/:id/book
// @access  Private
const bookMachine = async (req, res) => {
  try {
    const { jobId, until } = req.body;
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    if (!machine.availability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Machine is not available'
      });
    }

    machine.bookMachine(jobId, req.user._id, new Date(until));
    machine.lastUpdatedBy = req.user._id;
    await machine.save();

    const updatedMachine = await Machine.findById(machine._id)
      .populate('availability.currentJob', 'title status')
      .populate('availability.bookedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Machine booked successfully',
      data: updatedMachine
    });
  } catch (error) {
    console.error('Book machine error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Release machine
// @route   POST /api/machines/:id/release
// @access  Private
const releaseMachine = async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    machine.releaseMachine();
    machine.lastUpdatedBy = req.user._id;
    await machine.save();

    const updatedMachine = await Machine.findById(machine._id);

    res.json({
      success: true,
      message: 'Machine released successfully',
      data: updatedMachine
    });
  } catch (error) {
    console.error('Release machine error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add maintenance record
// @route   POST /api/machines/:id/maintenance
// @access  Private
const addMaintenanceRecord = async (req, res) => {
  try {
    const { type, description, cost, notes } = req.body;
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    machine.addMaintenanceRecord(type, description, req.user._id, cost, notes);
    machine.lastUpdatedBy = req.user._id;
    await machine.save();

    const updatedMachine = await Machine.findById(machine._id)
      .populate('maintenance.maintenanceHistory.performedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Maintenance record added successfully',
      data: updatedMachine
    });
  } catch (error) {
    console.error('Add maintenance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get machine statistics
// @route   GET /api/machines/stats
// @access  Private
const getMachineStats = async (req, res) => {
  try {
    const totalMachines = await Machine.countDocuments({ isActive: true });
    const operationalMachines = await Machine.countDocuments({ 
      status: 'operational', 
      isActive: true 
    });
    const maintenanceMachines = await Machine.countDocuments({ 
      status: 'maintenance', 
      isActive: true 
    });
    const brokenMachines = await Machine.countDocuments({ 
      status: 'broken', 
      isActive: true 
    });
    const availableMachines = await Machine.countDocuments({ 
      'availability.isAvailable': true, 
      isActive: true 
    });
    const overdueMaintenance = await Machine.countDocuments({ 
      'maintenance.nextMaintenance': { $lt: new Date() },
      isActive: true 
    });

    // Get machines by category
    const categoryStats = await Machine.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalMachines,
        byStatus: {
          operational: operationalMachines,
          maintenance: maintenanceMachines,
          broken: brokenMachines
        },
        available: availableMachines,
        overdueMaintenance,
        byCategory: categoryStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get machine stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  bookMachine,
  releaseMachine,
  addMaintenanceRecord,
  getMachineStats
};
