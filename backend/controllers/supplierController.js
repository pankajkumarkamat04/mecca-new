const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'businessInfo.companyName': { $regex: search, $options: 'i' } },
        { 'contactPerson.email': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;

    const suppliers = await Supplier.find(filter)
      .populate('categories', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Supplier.countDocuments(filter);

    res.json({
      success: true,
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get supplier by ID
// @route   GET /api/suppliers/:id
// @access  Private
const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('categories', 'name')
      .populate('createdBy', 'firstName lastName');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Get supplier by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new supplier
// @route   POST /api/suppliers
// @access  Private
const createSupplier = async (req, res) => {
  try {
    const supplierData = req.body;
    supplierData.createdBy = req.user._id;

    const supplier = new Supplier(supplierData);
    await supplier.save();

    const populatedSupplier = await Supplier.findById(supplier._id)
      .populate('categories', 'name');

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: populatedSupplier
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Supplier with this code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('categories', 'name');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete supplier (soft delete)
// @route   DELETE /api/suppliers/:id
// @access  Private
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier deactivated successfully'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get supplier statistics
// @route   GET /api/suppliers/:id/stats
// @access  Private
const getSupplierStats = async (req, res) => {
  try {
    const supplierId = req.params.id;
    
    const stats = {
      totalPurchases: 0,
      totalAmount: 0,
      averageOrderValue: 0,
      lastPurchase: null,
      rating: 3,
      creditUtilization: 0
    };

    const supplier = await Supplier.findById(supplierId)
      .select('totalPurchases lastPurchase rating creditLimit');

    if (supplier) {
      stats.totalPurchases = supplier.totalPurchases.count;
      stats.totalAmount = supplier.totalPurchases.amount;
      stats.averageOrderValue = supplier.totalPurchases.count > 0 
        ? supplier.totalPurchases.amount / supplier.totalPurchases.count 
        : 0;
      stats.lastPurchase = supplier.lastPurchase;
      stats.rating = supplier.rating;
      // TODO: Calculate credit utilization from actual outstanding amounts
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get supplier stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get top suppliers
// @route   GET /api/suppliers/top
// @access  Private
const getTopSuppliers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const suppliers = await Supplier.find({ isActive: true })
      .sort({ 'totalPurchases.amount': -1 })
      .limit(limit)
      .select('name code businessInfo.companyName totalPurchases rating');

    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error('Get top suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update supplier rating
// @route   PUT /api/suppliers/:id/rating
// @access  Private
const updateSupplierRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, reason } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    supplier.rating = rating;
    if (reason) {
      supplier.notes = supplier.notes ? 
        `${supplier.notes}\nRating updated: ${reason}` : 
        `Rating updated: ${reason}`;
    }

    await supplier.save();

    res.json({
      success: true,
      message: 'Supplier rating updated successfully',
      data: { rating: supplier.rating }
    });
  } catch (error) {
    console.error('Update supplier rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStats,
  getTopSuppliers,
  updateSupplierRating
};
