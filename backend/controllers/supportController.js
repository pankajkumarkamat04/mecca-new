const Support = require('../models/Support');
const Customer = require('../models/Customer');
const User = require('../models/User');

// @desc    Get all support tickets
// @route   GET /api/support
// @access  Private
const getSupportTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const priority = req.query.priority || '';
    const category = req.query.category || '';
    const assignedTo = req.query.assignedTo || '';
    const type = req.query.type || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (type) filter.type = type;

    const tickets = await Support.find(filter)
      .populate('customer', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Support.countDocuments(filter);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get support ticket by ID
// @route   GET /api/support/:id
// @access  Private
const getSupportTicketById = async (req, res) => {
  try {
    const ticket = await Support.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address')
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName email')
      .populate('conversations.user', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get support ticket by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new support ticket
// @route   POST /api/support
// @access  Private
const createSupportTicket = async (req, res) => {
  try {
    const ticketData = req.body;
    ticketData.createdBy = req.user._id;

    // Validate customer exists
    const customer = await Customer.findById(ticketData.customer);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const ticket = new Support(ticketData);
    await ticket.save();

    const populatedTicket = await Support.findById(ticket._id)
      .populate('customer', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: populatedTicket
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update support ticket
// @route   PUT /api/support/:id
// @access  Private
const updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const ticket = await Support.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('customer', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    res.json({
      success: true,
      message: 'Support ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Update support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete support ticket (soft delete)
// @route   DELETE /api/support/:id
// @access  Private
const deleteSupportTicket = async (req, res) => {
  try {
    const ticket = await Support.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    res.json({
      success: true,
      message: 'Support ticket deleted successfully'
    });
  } catch (error) {
    console.error('Delete support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add conversation to ticket
// @route   POST /api/support/:id/conversations
// @access  Private
const addConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, isInternal, attachments } = req.body;

    const ticket = await Support.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    const conversationData = {
      user: req.user._id,
      message,
      isInternal: isInternal || false,
      attachments: attachments || []
    };

    await ticket.addConversation(conversationData);

    const updatedTicket = await Support.findById(ticket._id)
      .populate('conversations.user', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Conversation added successfully',
      data: updatedTicket.conversations
    });
  } catch (error) {
    console.error('Add conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Assign ticket
// @route   PUT /api/support/:id/assign
// @access  Private
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const ticket = await Support.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    await ticket.assignTo(assignedTo);

    const updatedTicket = await Support.findById(ticket._id)
      .populate('assignedTo', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: updatedTicket.assignedTo
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update ticket status
// @route   PUT /api/support/:id/status
// @access  Private
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ticket = await Support.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    await ticket.updateStatus(status);

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      data: { status: ticket.status }
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add satisfaction rating
// @route   POST /api/support/:id/satisfaction
// @access  Private
const addSatisfactionRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const ticket = await Support.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    await ticket.addSatisfaction(rating, feedback);

    res.json({
      success: true,
      message: 'Satisfaction rating added successfully',
      data: ticket.satisfaction
    });
  } catch (error) {
    console.error('Add satisfaction rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get support statistics
// @route   GET /api/support/stats
// @access  Private
const getSupportStats = async (req, res) => {
  try {
    const totalTickets = await Support.countDocuments({ isActive: true });
    
    const statusStats = await Support.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const priorityStats = await Support.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const categoryStats = await Support.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const averageResponseTime = await Support.aggregate([
      { $match: { isActive: true, 'sla.firstResponseAt': { $exists: true } } },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$sla.firstResponseAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      { $group: { _id: null, avgResponseTime: { $avg: '$responseTime' } } }
    ]);

    const overdueTickets = await Support.getOverdueTickets();

    res.json({
      success: true,
      data: {
        totalTickets,
        statusStats,
        priorityStats,
        categoryStats,
        averageResponseTime: averageResponseTime[0]?.avgResponseTime || 0,
        overdueTickets: overdueTickets.length
      }
    });
  } catch (error) {
    console.error('Get support stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get overdue tickets
// @route   GET /api/support/overdue
// @access  Private
const getOverdueTickets = async (req, res) => {
  try {
    const overdueTickets = await Support.getOverdueTickets();

    res.json({
      success: true,
      data: overdueTickets
    });
  } catch (error) {
    console.error('Get overdue tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getSupportTickets,
  getSupportTicketById,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  addConversation,
  assignTicket,
  updateTicketStatus,
  addSatisfactionRating,
  getSupportStats,
  getOverdueTickets
};
