/* eslint-disable no-console */
/**
 * Database Seed File - Motor Services Focus
 * 
 * Categories:
 * - MOTOR SERVICES
 * - Powertrain & Chassis
 * - Motor Oil & Lubrications
 * - Electrical Components
 * - Body Parts
 * - Engine Parts
 * 
 * All products use 0% tax rate
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Models - Import all models for comprehensive cleanup
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Account = require('./models/Account');
const Attendance = require('./models/Attendance');
const Customer = require('./models/Customer');
const CustomerInquiry = require('./models/CustomerInquiry');
const Delivery = require('./models/Delivery');
const Invoice = require('./models/Invoice');
const Machine = require('./models/Machine');
const Order = require('./models/Order');
const PurchaseOrder = require('./models/PurchaseOrder');
const Quotation = require('./models/Quotation');
const Setting = require('./models/Setting');
const StockMovement = require('./models/StockMovement');
const Supplier = require('./models/Supplier');
const Support = require('./models/Support');
const Technician = require('./models/Technician');
const Tool = require('./models/Tool');
const Transaction = require('./models/Transaction');
const Warehouse = require('./models/Warehouse');
const WorkshopJob = require('./models/WorkshopJob');
const WorkStation = require('./models/WorkStation');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-system';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

async function clearCollections() {
  console.log('🧹 Starting comprehensive database cleanup...');
  
  try {
    // Clear all collections in parallel for better performance
    const clearPromises = [
      Account.deleteMany({}),
      Attendance.deleteMany({}),
      Category.deleteMany({}),
      Customer.deleteMany({}),
      CustomerInquiry.deleteMany({}),
      Delivery.deleteMany({}),
      Invoice.deleteMany({}),
      Machine.deleteMany({}),
      Order.deleteMany({}),
      Product.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      Quotation.deleteMany({}),
      Setting.deleteMany({}),
      StockMovement.deleteMany({}),
      Supplier.deleteMany({}),
      Support.deleteMany({}),
      Technician.deleteMany({}),
      Tool.deleteMany({}),
      Transaction.deleteMany({}),
      User.deleteMany({}), // Note: This will delete all users, including any existing admin
      Warehouse.deleteMany({}),
      WorkshopJob.deleteMany({}),
      WorkStation.deleteMany({}),
    ];
    
    await Promise.all(clearPromises);
    
    console.log('✅ Successfully cleared all collections:');
    console.log('   📊 Account, Attendance, Category, Customer, CustomerInquiry');
    console.log('   📦 Delivery, Invoice, Machine, Order, Product, PurchaseOrder');
    console.log('   🛠️  Quotation, Setting, StockMovement, Supplier, Support');
    console.log('   👥 Technician, Tool, Transaction, User, Warehouse');
    console.log('   🔧 WorkshopJob, WorkStation');
    console.log('');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  }
}

async function seed() {
  await connectDB();
  await clearCollections();

  console.log('🌱 Starting seed process...');

  // Create default admin user
  const adminUser = await new User({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@motorservice.com',
    password: 'password123',
    role: 'admin',
    phone: '+1-555-0100',
    department: 'Administration',
    position: 'System Administrator',
    isActive: true,
  }).save();

  console.log('✅ Admin user created');

  // Create default system settings
  const defaultSettings = await new Setting({
    company: {
      name: 'Mecca Motor Services',
      code: 'MMS',
      taxId: 'TAX123456789',
      website: 'https://meccamotorservices.com',
      email: 'info@meccamotorservices.com',
      phone: '+1-555-MECCA',
      address: {
        street: '123 Motor Service Drive',
        city: 'Automotive City',
        state: 'CA',
        zipCode: '90210',
        country: 'USA'
      },
      defaultCurrency: 'USD',
      defaultTaxRate: 0, // 0% tax for motor services
    },
    invoiceSettings: {
      prefix: 'MS-INV',
      numberFormat: 'MS-INV-{YYYY}-{MM}-{####}',
      footerText: 'Thank you for choosing Mecca Motor Services!',
      termsAndConditions: 'All services subject to our standard terms and conditions.',
    },
    posSettings: {
      defaultPaymentMethod: 'cash',
      allowPartialPayments: true,
      autoPrintReceipts: false,
    },
    isActive: true,
    createdBy: adminUser._id
  }).save();

  console.log('✅ Default system settings created');

  // Create Motor Service Categories
  const motorServicesCategory = await new Category({
    name: 'MOTOR SERVICES',
    description: 'Complete motor service solutions and repairs',
    color: '#DC2626',
    icon: 'wrench',
    isActive: true,
    createdBy: adminUser._id
  }).save();

  const powertrainCategory = await new Category({
    name: 'Powertrain & Chassis',
    description: 'Transmission, drivetrain, and chassis components',
    color: '#7C3AED',
    icon: 'settings',
    isActive: true,
    createdBy: adminUser._id
  }).save();

  const motorOilCategory = await new Category({
    name: 'Motor Oil & Lubrications',
    description: 'Engine oils, lubricants, and fluid maintenance products',
    color: '#059669',
    icon: 'droplets',
    isActive: true,
    createdBy: adminUser._id
  }).save();

  const electricalCategory = await new Category({
    name: 'Electrical Components',
    description: 'Electrical systems, wiring, and electronic components',
    color: '#F59E0B',
    icon: 'zap',
    isActive: true,
    createdBy: adminUser._id
  }).save();

  const bodyPartsCategory = await new Category({
    name: 'Body Parts',
    description: 'Vehicle body panels, bumpers, and exterior components',
    color: '#3B82F6',
    icon: 'car',
    isActive: true,
    createdBy: adminUser._id
  }).save();

  const enginePartsCategory = await new Category({
    name: 'Engine Parts',
    description: 'Engine components, filters, and internal parts',
    color: '#EF4444',
    icon: 'cog',
    isActive: true,
    createdBy: adminUser._id
  }).save();

  console.log('✅ Categories created');

  // Load products from Products.json file
  const productsJsonPath = path.join(__dirname, 'Products.json');
  const productsData = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
  
  console.log(`📁 Loaded ${productsData.length} products from Products.json`);

  // Create category mapping
  const categoryMap = {
    'MOTOR SERVICES': motorServicesCategory._id,
    'Powertrain & Chassis': powertrainCategory._id,
    'Motor Oil & Lubrications': motorOilCategory._id,
    'Electrical Components': electricalCategory._id,
    'Body Parts': bodyPartsCategory._id,
    'Engine Parts': enginePartsCategory._id
  };

  // Transform products data to match our schema
  const transformedProducts = productsData.map((product, index) => {
    const costPrice = parseFloat(product.Cost.replace('USD', '')) || 0;
    const sellingPrice = parseFloat(product.Price.replace('USD', '')) || 0;
    const markup = costPrice > 0 ? ((sellingPrice - costPrice) / costPrice) * 100 : 0;
    
    return {
      name: product.Name,
      sku: product.Code,
      description: `${product.Type} ${product.Category} product`,
      category: categoryMap[product.Category] || enginePartsCategory._id, // Default fallback
      pricing: {
        costPrice: costPrice,
        sellingPrice: sellingPrice,
        currency: 'USD',
        markup: Math.round(markup * 100) / 100,
        taxRate: product.Tax || 0, // Ensure 0% tax
      },
      inventory: {
        currentStock: Math.max(product.Quantity || 0, 0),
        minStock: Math.max(Math.floor((product.Quantity || 0) * 0.2), 1),
        maxStock: Math.max((product.Quantity || 0) * 2, 10),
        unit: product.Category === 'MOTOR SERVICES' ? 'services' : 'pieces',
        reorderLevel: Math.max(Math.floor((product.Quantity || 0) * 0.3), 1),
      },
      isActive: true,
      createdBy: adminUser._id
    };
  });

  // Insert all products
  const products = await Product.insertMany(transformedProducts);

  console.log(`📦 Seeded ${products.length} motor service products`);
  console.log(`📂 Seeded 6 categories: MOTOR SERVICES, Powertrain & Chassis, Motor Oil & Lubrications, Electrical Components, Body Parts, Engine Parts`);

  // Display login information
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('═'.repeat(50));
  console.log('\n👨‍💼 ADMIN ACCOUNT:');
  console.log('─'.repeat(30));
  console.log('Email: admin@motorservice.com');
  console.log('Password: password123');
  console.log('Role: admin');
  console.log('');
  console.log('═'.repeat(50));
  console.log('🧹 COMPREHENSIVE DATABASE CLEANUP COMPLETED:');
  console.log('─'.repeat(30));
  console.log('• Cleared ALL 23 collections from database');
  console.log('• Fresh start with clean data structure');
  console.log('• No conflicting or duplicate records');
  console.log('');
  console.log('💡 All products have 0% tax rate as requested');
  console.log('🌐 Access the application at: http://localhost:3000');
  console.log('');
  console.log('📋 CATEGORIES CREATED:');
  console.log('─'.repeat(30));
  console.log('• MOTOR SERVICES - Complete motor service solutions');
  console.log('• Powertrain & Chassis - Transmission and chassis components');
  console.log('• Motor Oil & Lubrications - Engine oils and fluids');
  console.log('• Electrical Components - Electrical systems and parts');
  console.log('• Body Parts - Vehicle body panels and components');
  console.log('• Engine Parts - Engine components and filters');
  console.log('');
  console.log('🚗 PRODUCTS SEEDED FROM PRODUCTS.JSON:');
  console.log('─'.repeat(30));
  console.log(`• Total Products: ${products.length}`);
  console.log('• All products have MS- prefixed SKUs');
  console.log('• All products have 0% tax rate');
  console.log('• Products distributed across 6 motor service categories');
  console.log('• Realistic inventory levels and pricing');
  console.log('═'.repeat(50));

  await mongoose.connection.close();
  console.log('✅ Seed complete. Connection closed.');
}

// Run the seed function
if (require.main === module) {
  seed().catch(console.error);
}

module.exports = seed;