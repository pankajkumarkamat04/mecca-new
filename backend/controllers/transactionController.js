const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const status = req.query.status || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { transactionNumber: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .populate('entries.account', 'name code type')
      .populate('customer', 'firstName lastName')
      .populate('supplier', 'name')
      .populate('invoice', 'invoiceNumber')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('entries.account', 'name code type')
      .populate('customer', 'firstName lastName email')
      .populate('supplier', 'name email')
      .populate('invoice', 'invoiceNumber totalAmount')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .populate('reconciledBy', 'firstName lastName');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const transactionData = req.body;
    transactionData.createdBy = req.user._id;

    // Validate accounts exist
    for (const entry of transactionData.entries) {
      const account = await Account.findById(entry.account);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: `Account ${entry.account} not found`
        });
      }
    }

    const transaction = new Transaction(transactionData);
    await transaction.save();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('entries.account', 'name code type')
      .populate('customer', 'firstName lastName')
      .populate('supplier', 'name')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: populatedTransaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const transaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('entries.account', 'name code type')
    .populate('customer', 'firstName lastName')
    .populate('supplier', 'name')
    .populate('createdBy', 'firstName lastName');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'posted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete posted transactions'
      });
    }

    await Transaction.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve transaction
// @route   PUT /api/transactions/:id/approve
// @access  Private
const approveTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft transactions can be approved'
      });
    }

    await transaction.approve(req.user._id);

    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Transaction approved successfully',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Approve transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Post transaction
// @route   PUT /api/transactions/:id/post
// @access  Private
const postTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.post();

    res.json({
      success: true,
      message: 'Transaction posted successfully'
    });
  } catch (error) {
    console.error('Post transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Reconcile transaction
// @route   PUT /api/transactions/:id/reconcile
// @access  Private
const reconcileTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.reconcile(req.user._id);

    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('reconciledBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Transaction reconciled successfully',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Reconcile transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
const getTransactionStats = async (req, res) => {
  try {
    const startDate = req.query.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate || new Date();

    const totalTransactions = await Transaction.countDocuments({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    const statusStats = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const typeStats = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyTrend = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalTransactions,
        statusStats,
        typeStats,
        monthlyTrend
      }
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  postTransaction,
  reconcileTransaction,
  getTransactionStats
};
