const Quotation = require('../models/Quotation');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const { notifyWarehouseOfNewOrder } = require('../utils/warehouseNotification');

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private
const getQuotations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const customerId = req.query.customerId || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (customerId) filter.customer = customerId;

    // If user is a customer, only show their own quotations
    if (req.user && req.user.role === 'customer') {
      // Find customer record by user ID
      const customerRecord = await Customer.findOne({ user: req.user._id });
      if (customerRecord) {
        filter.customer = customerRecord._id;
      } else {
        // If no customer record found, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, pages: 0 }
        });
      }
    }

    const quotations = await Quotation.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('convertedToInvoice', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Quotation.countDocuments(filter);

    res.json({
      success: true,
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get quotation by ID
// @route   GET /api/quotations/:id
// @access  Private
const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address')
      .populate('createdBy', 'firstName lastName')
      .populate('convertedToInvoice', 'invoiceNumber')
      .populate('items.product', 'name sku description pricing inventory');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Get quotation by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new quotation
// @route   POST /api/quotations
// @access  Private
const createQuotation = async (req, res) => {
  try {
    const quotationData = req.body;
    quotationData.createdBy = req.user._id;

    // Get default tax rate from company settings
    const settings = await Setting.getSingleton();
    const defaultTaxRate = Number(settings?.company?.defaultTaxRate || 0);

    // Generate quotation number
    quotationData.quotationNumber = await Quotation.generateQuotationNumber();

    // Validate customer exists
    if (quotationData.customer) {
      const customer = await Customer.findById(quotationData.customer);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      quotationData.customerName = `${customer.firstName} ${customer.lastName}`;
      quotationData.customerEmail = customer.email;
      quotationData.customerPhone = customer.phone;
      quotationData.customerAddress = customer.address;
    }

    // Validate products exist and populate item details
    const inventoryStatus = [];
    for (let item of quotationData.items) {
      if (item.product) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }
        item.name = product.name;
        item.description = product.description;
        if (!item.unitPrice) {
          item.unitPrice = product.pricing.sellingPrice;
        }
        // Set tax rate: use provided rate, or product's tax rate, or company default tax rate
        if (!item.taxRate) {
          const productTaxRate = product.pricing?.taxRate || 0;
          item.taxRate = productTaxRate > 0 ? productTaxRate : defaultTaxRate;
        }
        
        // Check inventory availability
        const currentStock = product.inventory?.currentStock || 0;
        const minStock = product.inventory?.minStock || 0;
        const available = Math.max(0, currentStock - minStock);
        
        inventoryStatus.push({
          productId: item.product,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableQuantity: available,
          currentStock: currentStock,
          isAvailable: available >= item.quantity,
          needsReorder: currentStock <= minStock
        });
      }
    }

    const quotation = new Quotation(quotationData);
    await quotation.save();

    const populatedQuotation = await Quotation.findById(quotation._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.product', 'name sku description');

    res.status(201).json({
      success: true,
      data: populatedQuotation,
      inventoryStatus: inventoryStatus
    });
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
// @access  Private
const updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Don't allow updates to converted quotations
    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update converted quotation'
      });
    }

    // Get default tax rate from company settings
    const settings = await Setting.getSingleton();
    const defaultTaxRate = Number(settings?.company?.defaultTaxRate || 0);

    const updateData = req.body;

    // Validate customer if provided
    if (updateData.customer) {
      const customer = await Customer.findById(updateData.customer);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      updateData.customerName = `${customer.firstName} ${customer.lastName}`;
      updateData.customerEmail = customer.email;
      updateData.customerPhone = customer.phone;
      updateData.customerAddress = customer.address;
    }

    // Validate products if provided
    if (updateData.items) {
      for (let item of updateData.items) {
        if (item.product) {
          const product = await Product.findById(item.product);
          if (!product) {
            return res.status(404).json({
              success: false,
              message: `Product not found: ${item.product}`
            });
          }
          item.name = product.name;
          item.description = product.description;
          // Set tax rate: use provided rate, or product's tax rate, or company default tax rate
          if (!item.taxRate) {
            const productTaxRate = product.pricing?.taxRate || 0;
            item.taxRate = productTaxRate > 0 ? productTaxRate : defaultTaxRate;
          }
        }
      }
    }

    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.product', 'name sku description');

    res.json({
      success: true,
      data: updatedQuotation
    });
  } catch (error) {
    console.error('Update quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
// @access  Private
const deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Don't allow deletion of converted quotations
    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete converted quotation'
      });
    }

    quotation.isActive = false;
    await quotation.save();

    res.json({
      success: true,
      message: 'Quotation deleted successfully'
    });
  } catch (error) {
    console.error('Delete quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Send quotation
// @route   POST /api/quotations/:id/send
// @access  Private
const sendQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft quotations can be sent'
      });
    }

    await quotation.markAsSent();

    res.json({
      success: true,
      message: 'Quotation sent successfully',
      data: quotation
    });
  } catch (error) {
    console.error('Send quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark quotation as viewed
// @route   POST /api/quotations/:id/view
// @access  Public (for customer viewing)
const markQuotationAsViewed = async (req, res) => {
  try {
    // Validate quotation ID format first
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID format'
      });
    }

    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Check if quotation is active
    if (!quotation.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This quotation is no longer active'
      });
    }

    // Only mark as viewed if it's currently in 'sent' status
    if (quotation.status === 'sent') {
      await quotation.markAsViewed();
    }

    res.json({
      success: true,
      message: 'Quotation marked as viewed',
      data: {
        status: quotation.status,
        viewedAt: quotation.viewedAt
      }
    });
  } catch (error) {
    console.error('Mark quotation as viewed error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'An error occurred while marking quotation as viewed'
    });
  }
};

// @desc    Accept quotation
// @route   POST /api/quotations/:id/accept
// @access  Public (for customer acceptance)
const acceptQuotation = async (req, res) => {
  try {
    // Validate quotation ID format first
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID format'
      });
    }

    const quotation = await Quotation.findById(req.params.id)
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name sku inventory');
      
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Check if quotation is active
    if (!quotation.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This quotation is no longer active'
      });
    }

    // Check quotation status
    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'This quotation has already been converted to an invoice'
      });
    }

    if (quotation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'This quotation has already been accepted'
      });
    }

    if (quotation.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'This quotation has been rejected and cannot be accepted'
      });
    }

    // Check if quotation is expired
    if (quotation.isExpired()) {
      // Auto-update status to expired
      quotation.status = 'expired';
      await quotation.save();
      
      return res.status(400).json({
        success: false,
        message: 'This quotation has expired and can no longer be accepted'
      });
    }

    // Check if quotation can be accepted (must be sent or viewed)
    if (!['sent', 'viewed'].includes(quotation.status)) {
      return res.status(400).json({
        success: false,
        message: 'This quotation cannot be accepted in its current status'
      });
    }

    // Check inventory availability before accepting
    const inventoryIssues = [];
    for (const item of quotation.items) {
      if (item.product && item.product.inventory) {
        const currentStock = item.product.inventory.currentStock || 0;
        const minStock = item.product.inventory.minStock || 0;
        const availableStock = Math.max(0, currentStock - minStock);
        
        if (availableStock < item.quantity) {
          inventoryIssues.push({
            productName: item.product.name || item.name,
            requested: item.quantity,
            available: availableStock
          });
        }
      }
    }

    // If there are inventory issues, provide a detailed warning but still allow acceptance
    let inventoryWarning = null;
    if (inventoryIssues.length > 0) {
      inventoryWarning = {
        message: 'Some items may have limited stock availability',
        items: inventoryIssues
      };
    }

    // Mark quotation as accepted
    await quotation.markAsAccepted();

    // Reload quotation with updated data
    const updatedQuotation = await Quotation.findById(quotation._id)
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name sku');

    res.json({
      success: true,
      message: 'Quotation accepted successfully',
      data: updatedQuotation,
      inventoryWarning
    });
  } catch (error) {
    console.error('Accept quotation error:', error);
    
    // Provide more specific error messages
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID format'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'An error occurred while accepting the quotation. Please try again.'
    });
  }
};

// @desc    Reject quotation
// @route   POST /api/quotations/:id/reject
// @access  Public (for customer rejection)
const rejectQuotation = async (req, res) => {
  try {
    // Validate quotation ID format first
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID format'
      });
    }

    const quotation = await Quotation.findById(req.params.id)
      .populate('customer', 'firstName lastName email');
      
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Check if quotation is active
    if (!quotation.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This quotation is no longer active'
      });
    }

    // Check quotation status
    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'This quotation has already been converted to an invoice and cannot be rejected'
      });
    }

    if (quotation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'This quotation has already been accepted and cannot be rejected'
      });
    }

    if (quotation.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'This quotation has already been rejected'
      });
    }

    // Check if quotation can be rejected (must be sent or viewed)
    if (!['sent', 'viewed'].includes(quotation.status)) {
      return res.status(400).json({
        success: false,
        message: 'This quotation cannot be rejected in its current status'
      });
    }

    // Optional: Get rejection reason from request body
    const rejectionReason = req.body.reason || '';
    
    // Mark quotation as rejected
    await quotation.markAsRejected();
    
    // If reason provided, add it to notes
    if (rejectionReason) {
      quotation.notes = quotation.notes ? 
        `${quotation.notes}\n\nRejection Reason: ${rejectionReason}` : 
        `Rejection Reason: ${rejectionReason}`;
      await quotation.save();
    }

    // Reload quotation with updated data
    const updatedQuotation = await Quotation.findById(quotation._id)
      .populate('customer', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Quotation rejected successfully',
      data: updatedQuotation
    });
  } catch (error) {
    console.error('Reject quotation error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID format'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'An error occurred while rejecting the quotation. Please try again.'
    });
  }
};

// @desc    Convert quotation to order
// @route   POST /api/quotations/:id/convert-to-order
// @access  Private
const convertQuotationToOrder = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address');
    
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Quotation already converted'
      });
    }

    // Only accepted quotations should be converted to orders
    if (quotation.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Only accepted quotations can be converted to orders'
      });
    }

    // Create order from quotation
    const orderData = {
      customer: quotation.customer._id,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      orderDate: new Date(),
      expectedDeliveryDate: quotation.validUntil,
      items: quotation.items.map(item => ({
        product: item.product,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        total: item.total
      })),
      subtotal: quotation.subtotal,
      totalDiscount: quotation.totalDiscount,
      totalTax: quotation.totalTax,
      totalAmount: quotation.totalAmount,
      notes: quotation.notes,
      terms: quotation.terms,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      source: 'quotation',
      quotation: quotation._id,
      createdBy: req.user._id
    };

    const order = new Order(orderData);
    await order.save();

    // Automatically create invoice for the order
    let createdInvoice = null;
    try {
      const invoiceData = {
        customer: quotation.customer._id,
        customerName: quotation.customerName,
        customerEmail: quotation.customerEmail,
        customerPhone: quotation.customerPhone,
        customerAddress: quotation.customerAddress,
        items: quotation.items.map(item => ({
          product: item.product,
          name: item.name,
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          taxRate: item.taxRate || 0,
          total: item.total || (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100))
        })),
        subtotal: quotation.subtotal,
        totalDiscount: quotation.totalDiscount,
        totalTax: quotation.totalTax,
        total: quotation.totalAmount,
        invoiceDate: new Date(),
        dueDate: quotation.validUntil ? new Date(quotation.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentMethod: 'cash',
        shippingMethod: 'pickup',
        notes: quotation.notes,
        terms: quotation.terms,
        order: order._id,
        quotation: quotation._id,
        type: 'sale',
        status: 'pending',
        createdBy: req.user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();
      createdInvoice = invoice;

      // Update order with invoice reference
      order.invoice = invoice._id;
      await order.save();

      console.log(`Invoice ${invoice.invoiceNumber} created automatically for order ${order.orderNumber} from quotation ${quotation.quotationNumber}`);
    } catch (invoiceError) {
      console.error('Failed to create automatic invoice:', invoiceError);
      // Don't fail the order creation if invoice creation fails
    }

    // Notify warehouse of new order from quotation conversion
    const notificationResult = await notifyWarehouseOfNewOrder(order, 'quotation');
    if (!notificationResult.success) {
      console.error('Failed to notify warehouse:', notificationResult.error);
    }

    // Mark quotation as converted
    quotation.status = 'converted';
    quotation.convertedAt = new Date();
    quotation.convertedToOrder = order._id;
    await quotation.save();

    res.json({
      success: true,
      message: 'Quotation converted to order successfully',
      data: {
        quotation,
        order,
        invoice: createdInvoice
      }
    });
  } catch (error) {
    console.error('Convert quotation to order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Convert quotation to invoice
// @route   POST /api/quotations/:id/convert
// @access  Private
const convertQuotationToInvoice = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address');
    
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Quotation already converted to invoice'
      });
    }

    if (quotation.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Only accepted quotations can be converted to invoice'
      });
    }

    // Create invoice from quotation
    const invoiceData = {
      customer: quotation.customer._id,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      items: quotation.items.map(item => ({
        product: item.product,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        total: item.total
      })),
      subtotal: quotation.subtotal,
      totalDiscount: quotation.totalDiscount,
      totalTax: quotation.totalTax,
      totalAmount: quotation.totalAmount,
      notes: quotation.notes,
      terms: quotation.terms,
      status: 'draft',
      createdBy: req.user._id
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Mark quotation as converted
    await quotation.convertToInvoice(invoice._id);

    res.json({
      success: true,
      message: 'Quotation converted to invoice successfully',
      data: {
        quotation,
        invoice
      }
    });
  } catch (error) {
    console.error('Convert quotation to invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get quotation statistics
// @route   GET /api/quotations/stats
// @access  Private
const getQuotationStats = async (req, res) => {
  try {
    const totalQuotations = await Quotation.countDocuments({ isActive: true });
    const draftQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'draft' 
    });
    const sentQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'sent' 
    });
    const viewedQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'viewed' 
    });
    const acceptedQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'accepted' 
    });
    const convertedQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'converted' 
    });
    const expiredQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'expired' 
    });

    // Calculate conversion rate
    const conversionRate = totalQuotations > 0 ? (convertedQuotations / totalQuotations) * 100 : 0;

    // Get total value of quotations
    const totalValue = await Quotation.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalQuotations,
        draft: draftQuotations,
        sent: sentQuotations,
        viewed: viewedQuotations,
        accepted: acceptedQuotations,
        converted: convertedQuotations,
        expired: expiredQuotations,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalValue: totalValue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get quotation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check inventory availability for quotation items
// @route   POST /api/quotations/check-inventory
// @access  Private
const checkInventoryAvailability = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const inventoryStatus = [];
    const unavailableItems = [];
    const lowStockItems = [];

    for (let item of items) {
      if (item.product && item.quantity) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }

        const currentStock = product.inventory?.currentStock || 0;
        const minStock = product.inventory?.minStock || 0;
        const maxStock = product.inventory?.maxStock || 0;
        const reorderPoint = product.inventory?.reorderPoint || 0;
        const available = Math.max(0, currentStock - minStock);
        
        const itemStatus = {
          productId: item.product,
          productName: product.name,
          sku: product.sku,
          requestedQuantity: item.quantity,
          availableQuantity: available,
          currentStock: currentStock,
          minStock: minStock,
          maxStock: maxStock,
          reorderPoint: reorderPoint,
          isAvailable: available >= item.quantity,
          needsReorder: currentStock <= reorderPoint,
          isLowStock: currentStock <= minStock,
          stockValue: currentStock * (product.pricing?.costPrice || 0)
        };

        inventoryStatus.push(itemStatus);

        if (!itemStatus.isAvailable) {
          unavailableItems.push(itemStatus);
        }

        if (itemStatus.isLowStock) {
          lowStockItems.push(itemStatus);
        }
      }
    }

    // Calculate summary
    const summary = {
      totalItems: items.length,
      availableItems: inventoryStatus.filter(item => item.isAvailable).length,
      unavailableItems: unavailableItems.length,
      lowStockItems: lowStockItems.length,
      totalStockValue: inventoryStatus.reduce((sum, item) => sum + item.stockValue, 0),
      canFulfillOrder: unavailableItems.length === 0
    };

    res.json({
      success: true,
      data: {
        inventoryStatus,
        summary,
        unavailableItems,
        lowStockItems
      }
    });
  } catch (error) {
    console.error('Check inventory availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Generate picking list for quotation
// @route   POST /api/quotations/:id/generate-picking-list
// @access  Private
const generatePickingList = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('items.product', 'name sku inventory warehouseLocation');
    
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Only accepted quotations can generate picking lists'
      });
    }

    const pickingList = {
      quotationId: quotation._id,
      quotationNumber: quotation.quotationNumber,
      customerName: quotation.customerName,
      generatedDate: new Date(),
      items: [],
      totalItems: 0,
      estimatedPickTime: 0
    };

    for (let item of quotation.items) {
      if (item.product) {
        const product = item.product;
        const location = product.inventory?.warehouseLocation;
        
        pickingList.items.push({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          location: location ? {
            zone: location.zone || 'N/A',
            aisle: location.aisle || 'N/A',
            shelf: location.shelf || 'N/A',
            bin: location.bin || 'N/A',
            locationCode: location.locationCode || 'N/A'
          } : null,
          priority: product.inventory?.currentStock <= product.inventory?.minStock ? 'high' : 'normal'
        });

        pickingList.totalItems += item.quantity;
        pickingList.estimatedPickTime += item.quantity * 0.5; // 30 seconds per item
      }
    }

    // Sort by location for efficient picking
    pickingList.items.sort((a, b) => {
      if (a.location && b.location) {
        if (a.location.zone !== b.location.zone) {
          return a.location.zone.localeCompare(b.location.zone);
        }
        if (a.location.aisle !== b.location.aisle) {
          return a.location.aisle.localeCompare(b.location.aisle);
        }
        return a.location.shelf.localeCompare(b.location.shelf);
      }
      return 0;
    });

    res.json({
      success: true,
      data: pickingList
    });
  } catch (error) {
    console.error('Generate picking list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  sendQuotation,
  markQuotationAsViewed,
  acceptQuotation,
  rejectQuotation,
  convertQuotationToOrder,
  convertQuotationToInvoice,
  getQuotationStats,
  checkInventoryAvailability,
  generatePickingList
};
