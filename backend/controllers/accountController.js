const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// @desc    Get all accounts
// @route   GET /api/accounts
// @access  Private
const getAccounts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const category = req.query.category || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) filter.type = type;
    if (category) filter.category = category;

    const accounts = await Account.find(filter)
      .populate('parentAccount', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ type: 1, code: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Account.countDocuments(filter);

    res.json({
      success: true,
      data: accounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get account by ID
// @route   GET /api/accounts/:id
// @access  Private
const getAccountById = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id)
      .populate('parentAccount', 'name code')
      .populate('createdBy', 'firstName lastName');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Get account by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new account
// @route   POST /api/accounts
// @access  Private
const createAccount = async (req, res) => {
  try {
    const accountData = req.body;
    accountData.createdBy = req.user._id;

    const account = new Account(accountData);
    await account.save();

    const populatedAccount = await Account.findById(account._id)
      .populate('parentAccount', 'name code')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: populatedAccount
    });
  } catch (error) {
    console.error('Create account error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Account with this code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update account
// @route   PUT /api/accounts/:id
// @access  Private
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const account = await Account.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('parentAccount', 'name code')
    .populate('createdBy', 'firstName lastName');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      message: 'Account updated successfully',
      data: account
    });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete account (soft delete)
// @route   DELETE /api/accounts/:id
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get chart of accounts
// @route   GET /api/accounts/chart
// @access  Private
const getChartOfAccounts = async (req, res) => {
  try {
    const accounts = await Account.getChartOfAccounts();

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Get chart of accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get accounts by type
// @route   GET /api/accounts/type/:type
// @access  Private
const getAccountsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { category, parentAccount } = req.query;

    const options = {};
    if (category) options.category = category;
    if (parentAccount) options.parentAccount = parentAccount;

    const accounts = await Account.getAccountsByType(type, options);

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Get accounts by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get account balance
// @route   GET /api/accounts/:id/balance
// @access  Private
const getAccountBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { asOfDate } = req.query;

    const balance = await Transaction.getAccountBalance(id, asOfDate ? new Date(asOfDate) : new Date());

    res.json({
      success: true,
      data: {
        accountId: id,
        balance,
        asOfDate: asOfDate || new Date()
      }
    });
  } catch (error) {
    console.error('Get account balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get account transactions
// @route   GET /api/accounts/:id/transactions
// @access  Private
const getAccountTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, type, status } = req.query;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (type) options.type = type;
    if (status) options.status = status;

    const transactions = await Transaction.getTransactionsByAccount(id, options);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get account transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get account statistics
// @route   GET /api/accounts/stats
// @access  Private
const getAccountStats = async (req, res) => {
  try {
    const totalAccounts = await Account.countDocuments({ isActive: true });
    
    const typeStats = await Account.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const categoryStats = await Account.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get balance summary by account type
    const balanceStats = await Account.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', totalBalance: { $sum: '$currentBalance' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalAccounts,
        typeStats,
        categoryStats,
        balanceStats
      }
    });
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getChartOfAccounts,
  getAccountsByType,
  getAccountBalance,
  getAccountTransactions,
  getAccountStats
};
