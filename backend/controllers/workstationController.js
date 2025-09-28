const WorkStation = require('../models/WorkStation');

// @desc    Get all workstations
// @route   GET /api/workstations
// @access  Private
const getWorkStations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      type = '', 
      status = '',
      available = ''
    } = req.query;

    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { stationNumber: { $regex: search, $options: 'i' } },
        { 'location.building': { $regex: search, $options: 'i' } },
        { 'location.section': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (available === 'true') query['availability.isAvailable'] = true;
    if (available === 'false') query['availability.isAvailable'] = false;

    const workstations = await WorkStation.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('availability.currentJob', 'title status')
      .populate('availability.bookedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WorkStation.countDocuments(query);

    res.json({
      success: true,
      data: {
        workstations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get workstations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get workstation by ID
// @route   GET /api/workstations/:id
// @access  Private
const getWorkStationById = async (req, res) => {
  try {
    const workstation = await WorkStation.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('availability.currentJob', 'title status customer')
      .populate('availability.bookedBy', 'firstName lastName');

    if (!workstation) {
      return res.status(404).json({
        success: false,
        message: 'Workstation not found'
      });
    }

    res.json({
      success: true,
      data: workstation
    });
  } catch (error) {
    console.error('Get workstation by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new workstation
// @route   POST /api/workstations
// @access  Private
const createWorkStation = async (req, res) => {
  try {
    const workstationData = {
      ...req.body,
      createdBy: req.user._id
    };

    const workstation = new WorkStation(workstationData);
    await workstation.save();

    const populatedWorkstation = await WorkStation.findById(workstation._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Workstation created successfully',
      data: populatedWorkstation
    });
  } catch (error) {
    console.error('Create workstation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Workstation with this station number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update workstation
// @route   PUT /api/workstations/:id
// @access  Private
const updateWorkStation = async (req, res) => {
  try {
    const workstation = await WorkStation.findById(req.params.id);

    if (!workstation) {
      return res.status(404).json({
        success: false,
        message: 'Workstation not found'
      });
    }

    Object.assign(workstation, req.body);
    workstation.lastUpdatedBy = req.user._id;
    await workstation.save();

    const updatedWorkstation = await WorkStation.findById(workstation._id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Workstation updated successfully',
      data: updatedWorkstation
    });
  } catch (error) {
    console.error('Update workstation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Workstation with this station number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete workstation
// @route   DELETE /api/workstations/:id
// @access  Private
const deleteWorkStation = async (req, res) => {
  try {
    const workstation = await WorkStation.findById(req.params.id);

    if (!workstation) {
      return res.status(404).json({
        success: false,
        message: 'Workstation not found'
      });
    }

    workstation.isActive = false;
    workstation.lastUpdatedBy = req.user._id;
    await workstation.save();

    res.json({
      success: true,
      message: 'Workstation deleted successfully'
    });
  } catch (error) {
    console.error('Delete workstation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Book workstation
// @route   POST /api/workstations/:id/book
// @access  Private
const bookWorkStation = async (req, res) => {
  try {
    const { jobId, until } = req.body;
    const workstation = await WorkStation.findById(req.params.id);

    if (!workstation) {
      return res.status(404).json({
        success: false,
        message: 'Workstation not found'
      });
    }

    if (!workstation.isCurrentlyAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Workstation is not currently available'
      });
    }

    workstation.bookWorkstation(jobId, req.user._id, new Date(until));
    workstation.lastUpdatedBy = req.user._id;
    await workstation.save();

    const updatedWorkstation = await WorkStation.findById(workstation._id)
      .populate('availability.currentJob', 'title status')
      .populate('availability.bookedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Workstation booked successfully',
      data: updatedWorkstation
    });
  } catch (error) {
    console.error('Book workstation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Release workstation
// @route   POST /api/workstations/:id/release
// @access  Private
const releaseWorkStation = async (req, res) => {
  try {
    const { jobDuration } = req.body;
    const workstation = await WorkStation.findById(req.params.id);

    if (!workstation) {
      return res.status(404).json({
        success: false,
        message: 'Workstation not found'
      });
    }

    workstation.releaseWorkstation();
    
    if (jobDuration) {
      workstation.updateUtilization(jobDuration);
    }
    
    workstation.lastUpdatedBy = req.user._id;
    await workstation.save();

    const updatedWorkstation = await WorkStation.findById(workstation._id);

    res.json({
      success: true,
      message: 'Workstation released successfully',
      data: updatedWorkstation
    });
  } catch (error) {
    console.error('Release workstation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Schedule maintenance
// @route   POST /api/workstations/:id/maintenance
// @access  Private
const scheduleMaintenance = async (req, res) => {
  try {
    const { maintenanceDate, notes } = req.body;
    const workstation = await WorkStation.findById(req.params.id);

    if (!workstation) {
      return res.status(404).json({
        success: false,
        message: 'Workstation not found'
      });
    }

    workstation.scheduleMaintenance(maintenanceDate ? new Date(maintenanceDate) : undefined, notes);
    workstation.lastUpdatedBy = req.user._id;
    await workstation.save();

    const updatedWorkstation = await WorkStation.findById(workstation._id);

    res.json({
      success: true,
      message: 'Maintenance scheduled successfully',
      data: updatedWorkstation
    });
  } catch (error) {
    console.error('Schedule maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get workstation statistics
// @route   GET /api/workstations/stats
// @access  Private
const getWorkStationStats = async (req, res) => {
  try {
    const totalWorkstations = await WorkStation.countDocuments({ isActive: true });
    const availableWorkstations = await WorkStation.countDocuments({ 
      'availability.isAvailable': true, 
      isActive: true 
    });
    const occupiedWorkstations = await WorkStation.countDocuments({ 
      status: 'occupied', 
      isActive: true 
    });
    const maintenanceWorkstations = await WorkStation.countDocuments({ 
      status: 'maintenance', 
      isActive: true 
    });
    const overdueMaintenance = await WorkStation.countDocuments({ 
      'maintenance.nextMaintenance': { $lt: new Date() },
      isActive: true 
    });

    // Get workstations by type
    const typeStats = await WorkStation.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get utilization rates
    const utilizationStats = await WorkStation.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          avgUtilization: { $avg: '$utilization.totalHoursUsed' },
          totalJobs: { $sum: '$utilization.totalJobsCompleted' },
          avgJobDuration: { $avg: '$utilization.averageJobDuration' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: totalWorkstations,
        available: availableWorkstations,
        occupied: occupiedWorkstations,
        maintenance: maintenanceWorkstations,
        overdueMaintenance,
        byType: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        utilization: utilizationStats[0] || {
          avgUtilization: 0,
          totalJobs: 0,
          avgJobDuration: 0
        }
      }
    });
  } catch (error) {
    console.error('Get workstation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getWorkStations,
  getWorkStationById,
  createWorkStation,
  updateWorkStation,
  deleteWorkStation,
  bookWorkStation,
  releaseWorkStation,
  scheduleMaintenance,
  getWorkStationStats
};
