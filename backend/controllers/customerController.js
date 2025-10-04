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
        { phone: { $regex: search, $options: 'i' } },
        { 'businessInfo.companyName': { $regex: search, $options: 'i' } }
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

    // Map company field to businessInfo.companyName if provided
    if (customerData.company) {
      customerData.businessInfo = {
        ...customerData.businessInfo,
        companyName: customerData.company
      };
      delete customerData.company;
    }

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




// @desc    Get customer statistics
// @route   GET /api/customers/:id/stats
// @access  Private
const getCustomerStats = async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Calculate customer statistics
    const Invoice = require('../models/Invoice');
    const Order = require('../models/Order');
    
    const stats = {
      totalInvoices: 0,
      totalPurchases: 0,
      averageOrderValue: 0,
      lastPurchase: null,
    };

    try {
      // Count invoices for this customer
      const invoiceCount = await Invoice.countDocuments({ customer: customerId });
      stats.totalInvoices = invoiceCount;

      // Sum total purchases from invoices
      const purchasesResult = await Invoice.aggregate([
        { $match: { customer: mongoose.Types.ObjectId(customerId) } },
        { $group: { _id: null, totalPurchases: { $sum: '$total' } } }
      ]);
      stats.totalPurchases = purchasesResult.length > 0 ? purchasesResult[0].totalPurchases : 0;

      // Get last purchase date
      const lastInvoice = await Invoice.findOne({ customer: customerId })
        .sort({ createdAt: -1 })
        .select('createdAt');
      stats.lastPurchase = lastInvoice ? lastInvoice.createdAt : null;

      // Calculate average order value
      if (invoiceCount > 0) {
        stats.averageOrderValue = stats.totalPurchases / invoiceCount;
      }
    } catch (error) {
      console.error('Error calculating customer stats:', error);
    }

    const customer = await Customer.findById(customerId)
      .select('totalPurchases lastPurchase');

    if (customer) {
      stats.totalInvoices = customer.totalPurchases.count;
      stats.totalPurchases = customer.totalPurchases.amount;
      stats.averageOrderValue = customer.totalPurchases.count > 0 
        ? customer.totalPurchases.amount / customer.totalPurchases.count 
        : 0;
      stats.lastPurchase = customer.lastPurchase;
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

// @desc    Find customer by phone number (for POS)
// @route   GET /api/customers/by-phone/:phone
// @access  Private
const getCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const customer = await Customer.findOne({ 
      phone: phone,
      isActive: true 
    }).select('firstName lastName email phone address businessInfo customerCode');

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
    console.error('Get customer by phone error:', error);
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
  getCustomerStats,
  getTopCustomers,
  getCustomerByPhone
};
