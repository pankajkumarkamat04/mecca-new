const Customer = require('../models/Customer');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const tier = req.query.tier || '';
    const phone = req.query.phone || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { customerCode: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (phone) filter.phone = { $regex: phone, $options: 'i' };

    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Customer.countDocuments(filter);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    customerData.createdBy = req.user._id;

    const customer = new Customer(customerData);
    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await Customer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete customer (soft delete)
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deactivated successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add wallet transaction
// @route   POST /api/customers/:id/wallet
// @access  Private
const addWalletTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description, reference } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    await customer.addWalletTransaction(type, amount, description, reference);

    res.json({
      success: true,
      message: 'Wallet transaction added successfully',
      data: {
        newBalance: customer.wallet.balance,
        transaction: customer.wallet.transactions[customer.wallet.transactions.length - 1]
      }
    });
  } catch (error) {
    console.error('Add wallet transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get customer wallet transactions
// @route   GET /api/customers/:id/wallet/transactions
// @access  Private
const getWalletTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const customer = await Customer.findById(id).select('wallet.transactions');
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const transactions = customer.wallet.transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(skip, skip + limit);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total: customer.wallet.transactions.length,
        pages: Math.ceil(customer.wallet.transactions.length / limit)
      }
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// @desc    Get customer statistics
// @route   GET /api/customers/:id/stats
// @access  Private
const getCustomerStats = async (req, res) => {
  try {
    const customerId = req.params.id;
    
    const stats = {
      totalInvoices: 0, // TODO: Count from Invoice model
      totalPurchases: 0, // TODO: Sum from Invoice model
      averageOrderValue: 0,
      lastPurchase: null,
      walletBalance: 0,
    };

    const customer = await Customer.findById(customerId)
      .select('totalPurchases lastPurchase wallet');

    if (customer) {
      stats.totalInvoices = customer.totalPurchases.count;
      stats.totalPurchases = customer.totalPurchases.amount;
      stats.averageOrderValue = customer.totalPurchases.count > 0 
        ? customer.totalPurchases.amount / customer.totalPurchases.count 
        : 0;
      stats.lastPurchase = customer.lastPurchase;
      stats.walletBalance = customer.wallet.balance;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get top customers
// @route   GET /api/customers/top
// @access  Private
const getTopCustomers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const filter = { isActive: true };

    const customers = await Customer.find(filter)
      .sort({ 'totalPurchases.amount': -1 })
      .limit(limit)
      .select('firstName lastName email totalPurchases');

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addWalletTransaction,
  getWalletTransactions,
  getCustomerStats,
  getTopCustomers
};
