const SalesOutlet = require('../models/SalesOutlet');

// @desc    Get all sales outlets
// @route   GET /api/sales-outlets
// @access  Private
const getSalesOutlets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const isActive = req.query.isActive;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { outletCode: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const outlets = await SalesOutlet.find(filter)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SalesOutlet.countDocuments(filter);

    res.json({
      success: true,
      data: outlets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sales outlets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get sales outlet by ID
// @route   GET /api/sales-outlets/:id
// @access  Private
const getSalesOutletById = async (req, res) => {
  try {
    const outlet = await SalesOutlet.findById(req.params.id)
      .populate('warehouse', 'name code address')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Sales outlet not found'
      });
    }

    res.json({
      success: true,
      data: outlet
    });
  } catch (error) {
    console.error('Get sales outlet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new sales outlet
// @route   POST /api/sales-outlets
// @access  Private
const createSalesOutlet = async (req, res) => {
  try {
    const outletData = req.body;
    outletData.createdBy = req.user._id;

    const outlet = new SalesOutlet(outletData);
    await outlet.save();

    const populatedOutlet = await SalesOutlet.findById(outlet._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Sales outlet created successfully',
      data: populatedOutlet
    });
  } catch (error) {
    console.error('Create sales outlet error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Outlet code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update sales outlet
// @route   PUT /api/sales-outlets/:id
// @access  Private
const updateSalesOutlet = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.updatedBy = req.user._id;

    const outlet = await SalesOutlet.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('warehouse', 'name code')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Sales outlet not found'
      });
    }

    res.json({
      success: true,
      message: 'Sales outlet updated successfully',
      data: outlet
    });
  } catch (error) {
    console.error('Update sales outlet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete sales outlet
// @route   DELETE /api/sales-outlets/:id
// @access  Private
const deleteSalesOutlet = async (req, res) => {
  try {
    const outlet = await SalesOutlet.findById(req.params.id);

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Sales outlet not found'
      });
    }

    // Soft delete - set isActive to false
    outlet.isActive = false;
    outlet.updatedBy = req.user._id;
    await outlet.save();

    res.json({
      success: true,
      message: 'Sales outlet deleted successfully'
    });
  } catch (error) {
    console.error('Delete sales outlet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get active sales outlets (for dropdown selection)
// @route   GET /api/sales-outlets/active/list
// @access  Private
const getActiveOutlets = async (req, res) => {
  try {
    const outlets = await SalesOutlet.find({ isActive: true })
      .select('outletCode name type address.city')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: outlets
    });
  } catch (error) {
    console.error('Get active outlets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get sales outlet stats
// @route   GET /api/sales-outlets/:id/stats
// @access  Private
const getOutletStats = async (req, res) => {
  try {
    const outlet = await SalesOutlet.findById(req.params.id);

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Sales outlet not found'
      });
    }

    res.json({
      success: true,
      data: outlet.stats
    });
  } catch (error) {
    console.error('Get outlet stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getSalesOutlets,
  getSalesOutletById,
  createSalesOutlet,
  updateSalesOutlet,
  deleteSalesOutlet,
  getActiveOutlets,
  getOutletStats
};

