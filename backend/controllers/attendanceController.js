const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// @desc    Get attendance records
// @route   GET /api/hrm/attendance
// @access  Private
const getAttendanceRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const employee = req.query.employee || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    const status = req.query.status || '';

    // Build filter object
    const filter = {};
    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(filter)
      .populate('employee', 'user employeeId department position')
      .populate('employee.user', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get attendance records error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check in employee
// @route   POST /api/hrm/attendance/checkin
// @access  Private
const checkIn = async (req, res) => {
  try {
    const { employeeId, location, notes } = req.body;

    // Validate employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Employee has already checked in today'
      });
    }

    const attendance = new Attendance({
      employee: employeeId,
      date: new Date(),
      checkIn: {
        time: new Date(),
        location,
        method: 'manual',
        notes
      },
      createdBy: req.user._id
    });

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employee', 'user employeeId')
      .populate('employee.user', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Check-in recorded successfully',
      data: populatedAttendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check out employee
// @route   POST /api/hrm/attendance/checkout
// @access  Private
const checkOut = async (req, res) => {
  try {
    const { employeeId, location, notes } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lt: tomorrow },
      'checkOut.time': { $exists: false }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No check-in found for today or already checked out'
      });
    }

    attendance.checkOut = {
      time: new Date(),
      location,
      method: 'manual',
      notes
    };

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employee', 'user employeeId')
      .populate('employee.user', 'firstName lastName');

    res.json({
      success: true,
      message: 'Check-out recorded successfully',
      data: populatedAttendance
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add break to attendance
// @route   POST /api/hrm/attendance/:id/breaks
// @access  Private
const addBreak = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, type, notes } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    const breakData = {
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      type: type || 'personal',
      notes
    };

    if (endTime) {
      breakData.duration = Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60)); // in minutes
    }

    attendance.breaks.push(breakData);
    await attendance.save();

    res.json({
      success: true,
      message: 'Break added successfully',
      data: attendance.breaks[attendance.breaks.length - 1]
    });
  } catch (error) {
    console.error('Add break error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update attendance record
// @route   PUT /api/hrm/attendance/:id
// @access  Private
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const attendance = await Attendance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('employee', 'user employeeId')
    .populate('employee.user', 'firstName lastName');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve attendance record
// @route   PUT /api/hrm/attendance/:id/approve
// @access  Private
const approveAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    attendance.isApproved = true;
    attendance.approvedBy = req.user._id;
    attendance.approvedAt = new Date();
    
    if (notes) {
      attendance.notes = attendance.notes ? 
        `${attendance.notes}\nApproval: ${notes}` : 
        `Approval: ${notes}`;
    }

    await attendance.save();

    res.json({
      success: true,
      message: 'Attendance record approved successfully'
    });
  } catch (error) {
    console.error('Approve attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get employee attendance summary
// @route   GET /api/hrm/attendance/employee/:employeeId/summary
// @access  Private
const getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const startDate = req.query.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate || new Date();

    const result = await Attendance.getEmployeeSummary(employeeId, startDate, endDate);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get employee attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get attendance statistics
// @route   GET /api/hrm/attendance/stats
// @access  Private
const getAttendanceStats = async (req, res) => {
  try {
    const startDate = req.query.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate || new Date();
    const department = req.query.department || '';

    const stats = await Attendance.getAttendanceStats(startDate, endDate, department);

    // Get daily attendance for the period
    const dailyAttendance = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          totalHours: { $sum: '$totalHours' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        dailyAttendance
      }
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get today's attendance
// @route   GET /api/hrm/attendance/today
// @access  Private
const getTodaysAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    })
    .populate('employee', 'user employeeId department position')
    .populate('employee.user', 'firstName lastName email')
    .sort({ 'checkIn.time': -1 });

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get today\'s attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAttendanceRecords,
  checkIn,
  checkOut,
  addBreak,
  updateAttendance,
  approveAttendance,
  getEmployeeAttendanceSummary,
  getAttendanceStats,
  getTodaysAttendance
};
