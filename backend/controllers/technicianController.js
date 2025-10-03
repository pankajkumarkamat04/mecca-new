const Technician = require('../models/Technician');
const User = require('../models/User');

// @desc    Get all technicians
// @route   GET /api/technicians
// @access  Private
const getTechnicians = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      department = '', 
      position = '',
      status = '',
      available = ''
    } = req.query;

    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { 'user.firstName': { $regex: search, $options: 'i' } },
        { 'user.lastName': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) query.department = department;
    if (position) query.position = position;
    if (status) query.employmentStatus = status;
    if (available === 'true') query.employmentStatus = 'active';

    const technicians = await Technician.find(query)
      .populate('user', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('workInfo.workStation', 'name stationNumber')
      .populate('currentJobs.job', 'title status priority')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Technician.countDocuments(query);

    res.json({
      success: true,
      data: {
        technicians,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get technician by ID
// @route   GET /api/technicians/:id
// @access  Private
const getTechnicianById = async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('workInfo.workStation', 'name stationNumber')
      .populate('currentJobs.job', 'title status priority customer')
      .populate('currentLeave.approvedBy', 'firstName lastName');

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    res.json({
      success: true,
      data: technician
    });
  } catch (error) {
    console.error('Get technician by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new technician
// @route   POST /api/technicians
// @access  Private
const createTechnician = async (req, res) => {
  try {
    console.log('Create technician request body:', req.body);
    const { userId, name, employeeId, department, position, hireDate, user: userField, ...otherData } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Technician name is required'
      });
    }

    // Check if user exists
    let user = null;
    if (userId && userId.trim() !== '') {
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if technician already exists for this user
      const existingTechnician = await Technician.findOne({ user: userId });
      if (existingTechnician) {
        return res.status(400).json({
          success: false,
          message: 'Technician profile already exists for this user'
        });
      }
    }

    // Handle hireDate - use current date if not provided or invalid
    let validHireDate = new Date();
    if (hireDate && !isNaN(new Date(hireDate).getTime())) {
      validHireDate = new Date(hireDate);
    }

    // Clean up otherData to remove invalid fields
    const cleanedOtherData = { ...otherData };
    
    // Remove fields that should be arrays but are strings
    const arrayFields = ['skills', 'availability', 'currentLeave', 'performance', 'currentJobs'];
    arrayFields.forEach(field => {
      if (cleanedOtherData[field] && typeof cleanedOtherData[field] === 'string') {
        delete cleanedOtherData[field];
      }
      if (cleanedOtherData[field] === '') {
        delete cleanedOtherData[field];
      }
    });

    // Note: user field is already extracted separately above, so it won't be in cleanedOtherData

    console.log('Cleaned otherData:', cleanedOtherData);

    const technicianData = {
      name: name.trim(),
      employeeId: employeeId || null,
      department: department || 'workshop',
      position: position || 'technician',
      hireDate: validHireDate,
      ...cleanedOtherData,
      createdBy: req.user._id
    };

    // Only add user field if it's a valid ObjectId and user exists
    if (userId && userId.trim() !== '' && user) {
      technicianData.user = userId;
    }

    const technician = new Technician(technicianData);
    await technician.save();

    const populatedTechnician = await Technician.findById(technician._id)
      .populate('user', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Technician created successfully',
      data: populatedTechnician
    });
  } catch (error) {
    console.error('Create technician error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Technician with this employee ID already exists'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // Handle cast errors (like invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}: ${error.message}`
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update technician
// @route   PUT /api/technicians/:id
// @access  Private
const updateTechnician = async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    // Handle name field separately if provided
    if (req.body.name !== undefined) {
      if (!req.body.name || req.body.name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Technician name is required'
        });
      }
      technician.name = req.body.name.trim();
    }

    // Update other fields
    const { name, ...updateData } = req.body;
    Object.assign(technician, updateData);
    technician.lastUpdatedBy = req.user._id;
    await technician.save();

    const updatedTechnician = await Technician.findById(technician._id)
      .populate('user', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Technician updated successfully',
      data: updatedTechnician
    });
  } catch (error) {
    console.error('Update technician error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Technician with this employee ID already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete technician
// @route   DELETE /api/technicians/:id
// @access  Private
const deleteTechnician = async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    technician.isActive = false;
    technician.lastUpdatedBy = req.user._id;
    await technician.save();

    res.json({
      success: true,
      message: 'Technician deleted successfully'
    });
  } catch (error) {
    console.error('Delete technician error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add skill to technician
// @route   POST /api/technicians/:id/skills
// @access  Private
const addSkill = async (req, res) => {
  try {
    const { name, category, level, yearsExperience } = req.body;
    const technician = await Technician.findById(req.params.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    technician.addSkill(name, category, level, yearsExperience);
    technician.lastUpdatedBy = req.user._id;
    await technician.save();

    const updatedTechnician = await Technician.findById(technician._id)
      .populate('user', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Skill added successfully',
      data: updatedTechnician
    });
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add certification to technician
// @route   POST /api/technicians/:id/certifications
// @access  Private
const addCertification = async (req, res) => {
  try {
    const { name, issuingBody, certificateNumber, issuedDate, expiryDate, notes } = req.body;
    const technician = await Technician.findById(req.params.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    technician.addCertification(name, issuingBody, certificateNumber, new Date(issuedDate), new Date(expiryDate), notes);
    technician.lastUpdatedBy = req.user._id;
    await technician.save();

    const updatedTechnician = await Technician.findById(technician._id)
      .populate('user', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Certification added successfully',
      data: updatedTechnician
    });
  } catch (error) {
    console.error('Add certification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Request leave
// @route   POST /api/technicians/:id/leave
// @access  Private
const requestLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const technician = await Technician.findById(req.params.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    technician.requestLeave(type, new Date(startDate), new Date(endDate), reason);
    technician.lastUpdatedBy = req.user._id;
    await technician.save();

    const updatedTechnician = await Technician.findById(technician._id)
      .populate('user', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Leave request submitted successfully',
      data: updatedTechnician
    });
  } catch (error) {
    console.error('Request leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve/Reject leave
// @route   PUT /api/technicians/:id/leave/:leaveId
// @access  Private
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const technician = await Technician.findById(req.params.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    if (status === 'approved') {
      technician.approveLeave(req.params.leaveId, req.user._id, notes);
    } else if (status === 'rejected') {
      technician.rejectLeave(req.params.leaveId, req.user._id, notes);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected'
      });
    }

    technician.lastUpdatedBy = req.user._id;
    await technician.save();

    const updatedTechnician = await Technician.findById(technician._id)
      .populate('user', 'firstName lastName email phone')
      .populate('currentLeave.approvedBy', 'firstName lastName');

    res.json({
      success: true,
      message: `Leave ${status} successfully`,
      data: updatedTechnician
    });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Assign job to technician
// @route   POST /api/technicians/:id/assign-job
// @access  Private
const assignJob = async (req, res) => {
  try {
    const { jobId, role } = req.body;
    const technician = await Technician.findById(req.params.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    if (!technician.isCurrentlyAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Technician is not currently available'
      });
    }

    technician.assignJob(jobId, role);
    technician.lastUpdatedBy = req.user._id;
    await technician.save();

    const updatedTechnician = await Technician.findById(technician._id)
      .populate('user', 'firstName lastName email phone')
      .populate('currentJobs.job', 'title status priority');

    res.json({
      success: true,
      message: 'Job assigned successfully',
      data: updatedTechnician
    });
  } catch (error) {
    console.error('Assign job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Complete job for technician
// @route   POST /api/technicians/:id/complete-job
// @access  Private
const completeJob = async (req, res) => {
  try {
    const { jobId, rating } = req.body;
    const technician = await Technician.findById(req.params.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    technician.completeJob(jobId, rating);
    technician.lastUpdatedBy = req.user._id;
    await technician.save();

    const updatedTechnician = await Technician.findById(technician._id)
      .populate('user', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Job completed successfully',
      data: updatedTechnician
    });
  } catch (error) {
    console.error('Complete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update technician performance
// @route   POST /api/technicians/:id/performance
// @access  Private
const updatePerformance = async (req, res) => {
  try {
    const { 
      period, 
      jobsCompleted, 
      averageCompletionTime, 
      qualityRating, 
      customerSatisfaction, 
      safetyIncidents, 
      trainingHours, 
      notes 
    } = req.body;
    
    const technician = await Technician.findById(req.params.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    technician.updatePerformance(
      period, 
      jobsCompleted, 
      averageCompletionTime, 
      qualityRating, 
      customerSatisfaction, 
      safetyIncidents, 
      trainingHours, 
      notes
    );
    
    technician.lastUpdatedBy = req.user._id;
    await technician.save();

    const updatedTechnician = await Technician.findById(technician._id)
      .populate('user', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Performance updated successfully',
      data: updatedTechnician
    });
  } catch (error) {
    console.error('Update performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get technician statistics
// @route   GET /api/technicians/stats
// @access  Private
const getTechnicianStats = async (req, res) => {
  try {
    const totalTechnicians = await Technician.countDocuments({ isActive: true });
    const activeTechnicians = await Technician.countDocuments({ 
      employmentStatus: 'active', 
      isActive: true 
    });
    const onLeaveTechnicians = await Technician.countDocuments({ 
      employmentStatus: 'on_leave', 
      isActive: true 
    });
    const availableTechnicians = await Technician.countDocuments({ 
      employmentStatus: 'active',
      'statistics.currentWorkload': { $lt: { $expr: '$preferences.maxConcurrentJobs' } },
      isActive: true 
    });

    // Get technicians by department
    const departmentStats = await Technician.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    // Get technicians by position
    const positionStats = await Technician.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$position', count: { $sum: 1 } } }
    ]);

    // Get average performance metrics
    const performanceStats = await Technician.aggregate([
      { $match: { isActive: true, 'statistics.totalJobsCompleted': { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgJobsCompleted: { $avg: '$statistics.totalJobsCompleted' },
          avgJobRating: { $avg: '$statistics.averageJobRating' },
          avgHoursWorked: { $avg: '$statistics.totalHoursWorked' }
        }
      }
    ]);

    // Get expired certifications count
    const expiredCertifications = await Technician.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$certifications' },
      { $match: { 'certifications.isActive': true, 'certifications.expiryDate': { $lt: new Date() } } },
      { $count: 'expiredCount' }
    ]);

    res.json({
      success: true,
      data: {
        total: totalTechnicians,
        active: activeTechnicians,
        onLeave: onLeaveTechnicians,
        available: availableTechnicians,
        byDepartment: departmentStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPosition: positionStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        performance: performanceStats[0] || {
          avgJobsCompleted: 0,
          avgJobRating: 0,
          avgHoursWorked: 0
        },
        expiredCertifications: expiredCertifications[0]?.expiredCount || 0
      }
    });
  } catch (error) {
    console.error('Get technician stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get available technicians for workshop jobs
// @route   GET /api/technicians/available
// @access  Private
const getAvailableTechnicians = async (req, res) => {
  try {
    const technicians = await Technician.find({
      employmentStatus: 'active'
    })
    .populate('user', 'firstName lastName email phone')
    .select('user employeeId name department position statistics preferences currentJobs currentLeave employmentStatus isActive');

    // Filter technicians who are currently available using the virtual field
    const availableTechnicians = technicians.filter(tech => {
      // Ensure isActive has a value (fallback to true if undefined)
      if (tech.isActive === undefined) {
        tech.isActive = true;
      }
      
      // Use the virtual field to check availability for all technicians
      return tech.isCurrentlyAvailable;
    });

    res.json({
      success: true,
      technicians: availableTechnicians.map(tech => ({
        _id: tech._id,
        user: tech.user,
        name: tech.name,
        employeeId: tech.employeeId,
        department: tech.department,
        position: tech.position,
        isAvailable: tech.isCurrentlyAvailable,
        currentJobs: tech.currentJobs?.length || 0,
        completedJobs: tech.statistics?.completedJobs || 0,
        averageRating: tech.statistics?.averageRating || 0
      }))
    });
  } catch (error) {
    console.error('Get available technicians error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getTechnicians,
  getTechnicianById,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  addSkill,
  addCertification,
  requestLeave,
  updateLeaveStatus,
  assignJob,
  completeJob,
  updatePerformance,
  getTechnicianStats,
  getAvailableTechnicians
};
