const express = require('express');
const { auth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');
const {
  createSupportTicketValidation,
  updateSupportTicketValidation,
  addConversationValidation,
  updateTicketStatusValidation,
  assignTicketValidation,
  addSatisfactionRatingValidation
} = require('../validations/supportValidation');
const {
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
} = require('../controllers/supportController');

const router = express.Router();

// @route   GET /api/support
// @desc    Get all support tickets
// @access  Private
router.get('/', auth, validatePagination(), getSupportTickets);

// @route   GET /api/support/stats
// @desc    Get support statistics
// @access  Private
router.get('/stats', auth, getSupportStats);

// @route   GET /api/support/overdue
// @desc    Get overdue tickets
// @access  Private
router.get('/overdue', auth, getOverdueTickets);

// @route   POST /api/support
// @desc    Create new support ticket
// @access  Private
router.post('/', auth, validate(createSupportTicketValidation), createSupportTicket);

// @route   GET /api/support/:id
// @desc    Get support ticket by ID
// @access  Private
router.get('/:id', auth, validateObjectId(), getSupportTicketById);

// @route   PUT /api/support/:id
// @desc    Update support ticket
// @access  Private
router.put('/:id', auth, validateObjectId(), validate(updateSupportTicketValidation), updateSupportTicket);

// @route   DELETE /api/support/:id
// @desc    Delete support ticket
// @access  Private
router.delete('/:id', auth, validateObjectId(), deleteSupportTicket);

// @route   POST /api/support/:id/conversations
// @desc    Add conversation to ticket
// @access  Private
router.post('/:id/conversations', auth, validateObjectId(), validate(addConversationValidation), addConversation);

// @route   PUT /api/support/:id/assign
// @desc    Assign ticket
// @access  Private
router.put('/:id/assign', auth, validateObjectId(), validate(assignTicketValidation), assignTicket);

// @route   PUT /api/support/:id/status
// @desc    Update ticket status
// @access  Private
router.put('/:id/status', auth, validateObjectId(), validate(updateTicketStatusValidation), updateTicketStatus);

// @route   POST /api/support/:id/satisfaction
// @desc    Add satisfaction rating
// @access  Private
router.post('/:id/satisfaction', auth, validateObjectId(), validate(addSatisfactionRatingValidation), addSatisfactionRating);

module.exports = router;
