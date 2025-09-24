const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const brand = req.query.brand || '';
    const status = req.query.status || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    
    // Filter by stock status
    if (status === 'low_stock') {
      filter.$expr = {
        $lte: ['$inventory.currentStock', '$inventory.minStock']
      };
    } else if (status === 'out_of_stock') {
      filter.$expr = { $eq: ['$inventory.currentStock', 0] };
    }

    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('supplier', 'name contact')
      .populate('createdBy', 'firstName lastName');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    productData.createdBy = req.user._id;

    const product = new Product(productData);
    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('supplier', 'name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU or barcode already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('category', 'name')
    .populate('brand', 'name')
    .populate('supplier', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deactivated successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update product stock
// @route   PUT /api/products/:id/stock
// @access  Private
const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation, reason, reference } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let newStock;
    if (operation === 'add') {
      newStock = product.inventory.currentStock + quantity;
    } else if (operation === 'subtract') {
      newStock = product.inventory.currentStock - quantity;
      if (newStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock'
        });
      }
    } else if (operation === 'set') {
      newStock = quantity;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation'
      });
    }

    product.inventory.currentStock = Math.max(0, newStock);
    await product.save();

    // TODO: Create stock movement record
    // const stockMovement = new StockMovement({
    //   product: id,
    //   quantity: quantity,
    //   operation: operation,
    //   reason: reason,
    //   reference: reference,
    //   previousStock: product.inventory.currentStock,
    //   newStock: newStock,
    //   createdBy: req.user._id
    // });
    // await stockMovement.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        productId: id,
        newStock: product.inventory.currentStock,
        operation,
        quantity
      }
    });
  } catch (error) {
    console.error('Update product stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Private
const getLowStockProducts = async (req, res) => {
  try {
    const filter = {
      isActive: true,
      $expr: {
        $lte: ['$inventory.currentStock', '$inventory.minStock']
      }
    };

    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ 'inventory.currentStock': 1 });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get product statistics
// @route   GET /api/products/stats
// @access  Private
const getProductStats = async (req, res) => {
  try {
    const filter = { isActive: true };

    const totalProducts = await Product.countDocuments(filter);
    const lowStockProducts = await Product.countDocuments({
      ...filter,
      $expr: { $lte: ['$inventory.currentStock', '$inventory.minStock'] }
    });
    const outOfStockProducts = await Product.countDocuments({
      ...filter,
      $expr: { $eq: ['$inventory.currentStock', 0] }
    });

    // Calculate total stock value
    const products = await Product.find(filter).select('inventory.currentStock pricing.costPrice');
    const totalStockValue = products.reduce((sum, product) => {
      return sum + (product.inventory.currentStock * product.pricing.costPrice);
    }, 0);

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue
      }
    });
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getLowStockProducts,
  getProductStats
};
