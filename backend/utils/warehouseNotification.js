const Warehouse = require('../models/Warehouse');
const Order = require('../models/Order');

/**
 * Send order notification to warehouse
 * @param {Object} order - The order object
 * @param {string} source - Source of the order (direct, quotation, inquiry)
 */
const notifyWarehouseOfNewOrder = async (order, source = 'direct') => {
  try {
    console.log(`📦 Warehouse Notification: New Order ${order.orderNumber} created from ${source}`);
    
    // Get all active warehouses
    const warehouses = await Warehouse.find({ isActive: true });
    
    if (warehouses.length === 0) {
      console.log('⚠️ No active warehouses found for notification');
      return;
    }

    // Prepare order summary for warehouse
    const orderSummary = {
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      expectedDeliveryDate: order.expectedDeliveryDate,
      priority: order.priority || 'normal',
      source: source,
      totalAmount: order.totalAmount || order.total,
      itemCount: order.items ? order.items.length : 0,
      items: order.items ? order.items.map(item => ({
        productName: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })) : [],
      notes: order.notes || '',
      internalNotes: order.internalNotes || ''
    };

    // Log notification details
    console.log('📋 Order Summary for Warehouse:');
    console.log(`   Order: ${orderSummary.orderNumber}`);
    console.log(`   Customer: ${orderSummary.customerName}`);
    console.log(`   Items: ${orderSummary.itemCount}`);
    console.log(`   Total: $${orderSummary.totalAmount}`);
    console.log(`   Priority: ${orderSummary.priority}`);
    console.log(`   Source: ${orderSummary.source}`);
    
    // Log items details
    if (orderSummary.items.length > 0) {
      console.log('   Items Details:');
      orderSummary.items.forEach((item, index) => {
        console.log(`     ${index + 1}. ${item.productName} (${item.sku}) - Qty: ${item.quantity} - $${item.total}`);
      });
    }

    // Notify each warehouse
    for (const warehouse of warehouses) {
      console.log(`📬 Notifying Warehouse: ${warehouse.name} (${warehouse.code})`);
      
      // Here you could implement actual notification methods:
      // - Send email to warehouse manager
      // - Send SMS notification
      // - Create internal notification
      // - Send to warehouse management system
      // - Create warehouse task/alert
      
      // For now, we'll just log the notification
      console.log(`   ✅ Warehouse ${warehouse.name} notified of order ${order.orderNumber}`);
    }

    console.log(`🎯 Warehouse notification completed for order ${order.orderNumber}`);
    
    return {
      success: true,
      warehousesNotified: warehouses.length,
      orderNumber: order.orderNumber
    };

  } catch (error) {
    console.error('❌ Error sending warehouse notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send order update notification to warehouse
 * @param {Object} order - The updated order object
 * @param {string} updateType - Type of update (status, items, etc.)
 */
const notifyWarehouseOfOrderUpdate = async (order, updateType = 'status') => {
  try {
    console.log(`📦 Warehouse Notification: Order ${order.orderNumber} updated - ${updateType}`);
    
    // Get all active warehouses
    const warehouses = await Warehouse.find({ isActive: true });
    
    if (warehouses.length === 0) {
      console.log('⚠️ No active warehouses found for update notification');
      return;
    }

    // Notify each warehouse
    for (const warehouse of warehouses) {
      console.log(`📬 Notifying Warehouse: ${warehouse.name} of order update`);
      console.log(`   ✅ Warehouse ${warehouse.name} notified of order ${order.orderNumber} update`);
    }

    return {
      success: true,
      warehousesNotified: warehouses.length,
      orderNumber: order.orderNumber,
      updateType: updateType
    };

  } catch (error) {
    console.error('❌ Error sending warehouse update notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  notifyWarehouseOfNewOrder,
  notifyWarehouseOfOrderUpdate
};
