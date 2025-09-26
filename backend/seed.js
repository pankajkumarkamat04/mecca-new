/* eslint-disable no-console */
/**
 * Database Seed File
 * 
 * Role-based User Management:
 * - All registrations default to 'customer' role
 * - Only admins and managers can create other users
 * - Admin: Can create Manager, Employee, Customer
 * - Manager: Can create Employee, Customer
 * - Employee: Cannot create any users
 * - Customer: Cannot access user management
 * 
 * Phone-based Linking:
 * - Customer users have matching phone numbers with customer records
 * - POS and Workshop jobs can be created with phone numbers
 * - Automatic linking when customer registers with existing phone
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const User = require('./models/User');
const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');
const Category = require('./models/Category');
const Invoice = require('./models/Invoice');
const StockMovement = require('./models/StockMovement');
const Transaction = require('./models/Transaction');
const Account = require('./models/Account');
const Support = require('./models/Support');
const WorkshopJob = require('./models/WorkshopJob');
const Setting = require('./models/Setting');
const CustomerInquiry = require('./models/CustomerInquiry');
const Quotation = require('./models/Quotation');
const Order = require('./models/Order');
const Delivery = require('./models/Delivery');
const StockAlert = require('./models/StockAlert');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-system';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
}

async function clearCollections() {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Customer.deleteMany({}),
    Supplier.deleteMany({}),
    Category.deleteMany({}),
    Invoice.deleteMany({}),
    StockMovement.deleteMany({}),
    Transaction.deleteMany({}),
    Account.deleteMany({}),
    Support.deleteMany({}),
    WorkshopJob.deleteMany({}),
    Setting.deleteMany({}),
    CustomerInquiry.deleteMany({}),
    Quotation.deleteMany({}),
    Order.deleteMany({}),
    Delivery.deleteMany({}),
    StockAlert.deleteMany({}),
  ]);
  console.log('🧹 Cleared existing data');
}

async function seed() {
  await connectDB();
  await clearCollections();

  console.log('🌱 Starting seed process...');

  // Create default settings first
  const settings = await Setting.create({
    company: {
      name: 'Mecca POS Systems',
      code: 'MECCA001',
      taxId: '12-3456789',
      website: 'https://meccapos.com',
      email: 'info@meccapos.com',
      phone: '+1-555-0123',
      logo: { url: 'https://dummyimage.com/200x60/111827/ffffff&text=MECCA+POS' },
      address: {
        street: '123 Business Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      defaultCurrency: 'USD',
      defaultTaxRate: 10,
      invoiceSettings: {
        prefix: 'INV',
        numberFormat: 'INV-{YYYY}-{MM}-{####}',
        footerText: 'Thank you for your business!',
        termsAndConditions: 'Payment due within 30 days.'
      },
      posSettings: {
        receiptHeader: 'Welcome to Mecca POS',
        receiptFooter: 'Thank you for shopping with us!',
        showTaxBreakdown: true,
        autoPrint: false
      }
    },
    appearance: {
      theme: 'light',
      language: 'en',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY'
    },
    system: {
      maintenanceMode: false,
      allowRegistration: true,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      },
      backupSettings: {
        autoBackup: true,
        backupFrequency: 'daily',
        retentionDays: 30
      }
    }
  });

  // Users (use save() so pre-save hashing runs)
  const userSeedData = [
    {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@meccapos.com',
      password: 'password123',
      role: 'admin',
      phone: '+1-555-0001',
      department: 'IT',
      position: 'System Administrator',
      address: {
        street: '123 Admin St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      permissions: [
        { module: 'users', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'products', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'customers', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'suppliers', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'invoices', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'inventory', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'pos', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'workshop', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'support', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'accounts', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'transactions', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'reports', actions: ['read'] },
        { module: 'settings', actions: ['read', 'create', 'update', 'delete'] },
      ],
    },
    {
      firstName: 'John',
      lastName: 'Manager',
      email: 'manager@meccapos.com',
      password: 'password123',
      role: 'manager',
      phone: '+1-555-0002',
      department: 'Sales',
      position: 'Sales Manager',
      salary: { amount: 75000, currency: 'USD', paymentType: 'monthly' },
      hireDate: new Date('2023-01-15'),
      address: {
        street: '456 Manager Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        country: 'USA'
      },
    },
    {
      firstName: 'Sarah',
      lastName: 'Employee',
      email: 'employee@meccapos.com',
      password: 'password123',
      role: 'employee',
      phone: '+1-555-0003',
      department: 'Operations',
      position: 'Sales Associate',
      salary: { amount: 45000, currency: 'USD', paymentType: 'monthly' },
      hireDate: new Date('2023-06-01'),
      address: {
        street: '789 Employee St',
        city: 'New York',
        state: 'NY',
        zipCode: '10003',
        country: 'USA'
      },
    },
    // Warehouse Manager user
    {
      firstName: 'John',
      lastName: 'Warehouse',
      email: 'warehouse@meccapos.com',
      password: 'password123',
      role: 'warehouse_manager',
      phone: '+1-555-0004',
      department: 'Warehouse',
      position: 'Warehouse Manager',
      salary: { amount: 55000, currency: 'USD', paymentType: 'monthly' },
      hireDate: new Date('2023-05-01'),
      address: {
        street: '456 Warehouse Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10004',
        country: 'USA'
      },
    },
    // Customer users (created via registration, now default to customer role)
    {
      firstName: 'Alice',
      lastName: 'Customer',
      email: 'alice.customer@example.com',
      password: 'password123',
      role: 'customer',
      phone: '+1-555-2000', // Same phone as customer record
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      wallet: {
        balance: 50.00,
        currency: 'USD'
      },
      preferences: {
        language: 'en',
        timezone: 'America/New_York'
      }
    },
    {
      firstName: 'Bob',
      lastName: 'Customer',
      email: 'bob.customer@example.com',
      password: 'password123',
      role: 'customer',
      phone: '+1-555-2002', // Same phone as customer record
      address: {
        street: '789 Customer Rd',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        country: 'USA'
      },
      wallet: {
        balance: 25.00,
        currency: 'USD'
      },
      preferences: {
        language: 'en',
        timezone: 'America/New_York'
      }
    },
    {
      firstName: 'Maria',
      lastName: 'Customer',
      email: 'maria.customer@example.com',
      password: 'password123',
      role: 'customer',
      phone: '+1-555-2004', // Same phone as customer record
      address: {
        street: '654 Oak Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '73301',
        country: 'USA'
      },
      wallet: {
        balance: 100.00,
        currency: 'USD'
      },
      preferences: {
        language: 'en',
        timezone: 'America/Chicago'
      }
    }
  ];

  const users = await Promise.all(
    userSeedData.map((data) => new User(data).save())
  );

  // Categories (use save() so pre-save hook sets level/path)
  const catElectronics = await new Category({
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catOffice = await new Category({
    name: 'Office Supplies',
    description: 'Office equipment and supplies',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catAutomotive = await new Category({
    name: 'Automotive',
    description: 'Automotive parts and accessories',
    isActive: true,
    createdBy: users[0]._id
  }).save();

  // Child categories
  const catMice = await new Category({
    name: 'Mice',
    description: 'Computer mice and pointing devices',
    parent: catElectronics._id,
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catKeyboards = await new Category({
    name: 'Keyboards',
    description: 'Computer keyboards and accessories',
    parent: catElectronics._id,
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catChairs = await new Category({
    name: 'Chairs',
    description: 'Office chairs and seating',
    parent: catOffice._id,
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catBatteries = await new Category({
    name: 'Batteries',
    description: 'Automotive batteries and power',
    parent: catAutomotive._id,
    isActive: true,
    createdBy: users[0]._id
  }).save();

  // Suppliers
  const suppliers = await Supplier.insertMany([
    {
      name: 'TechCorp Electronics',
      code: 'SUP0001',
      businessInfo: {
        companyName: 'TechCorp Electronics',
        website: 'https://techcorp.com'
      },
      address: {
        street: '100 Tech Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA'
      },
      contactPerson: {
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'sales@techcorp.com',
        phone: '+1-555-1000'
      },
      paymentTerms: 30,
      creditLimit: 50000,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'OfficeMax Supplies',
      code: 'SUP0002',
      businessInfo: {
        companyName: 'OfficeMax Supplies',
        website: 'https://officemax.com'
      },
      address: {
        street: '200 Office Blvd',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA'
      },
      contactPerson: {
        firstName: 'Lisa',
        lastName: 'Brown',
        email: 'orders@officemax.com',
        phone: '+1-555-1001'
      },
      paymentTerms: 15,
      creditLimit: 30000,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'AutoParts Direct',
      code: 'SUP0003',
      businessInfo: {
        companyName: 'AutoParts Direct',
        website: 'https://autoparts.com'
      },
      address: {
        street: '300 Auto Way',
        city: 'Detroit',
        state: 'MI',
        zipCode: '48201',
        country: 'USA'
      },
      contactPerson: {
        firstName: 'Tom',
        lastName: 'Wilson',
        email: 'wholesale@autoparts.com',
        phone: '+1-555-1002'
      },
      paymentTerms: 45,
      creditLimit: 40000,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    }
  ]);

  // Customers
  const customers = await Customer.insertMany([
    {
      customerCode: 'CUST000001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-2000',
      address: {
        billing: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'male',
      totalPurchases: {
        count: 15,
        amount: 1250.00
      },
      lastPurchase: new Date('2024-01-10'),
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'CUST000002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@company.com',
      phone: '+1-555-2001',
      address: {
        billing: {
          street: '456 Business Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA'
        }
      },
      type: 'business',
      businessInfo: {
        companyName: 'Smith Enterprises',
        taxId: '12-3456789',
        website: 'https://smithenterprises.com'
      },
      totalPurchases: {
        count: 45,
        amount: 8750.00
      },
      lastPurchase: new Date('2024-01-08'),
      creditLimit: 10000,
      paymentTerms: 30,
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'CUST000003',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@email.com',
      phone: '+1-555-2002',
      address: {
        billing: {
          street: '789 Customer Rd',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1978-11-22'),
      gender: 'male',
      totalPurchases: {
        count: 3,
        amount: 250.00
      },
      lastPurchase: new Date('2024-01-05'),
      isActive: true,
      isVerified: false,
      createdBy: users[0]._id
    },
    {
      customerCode: 'CUST000004',
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'sarah.williams@techcorp.com',
      phone: '+1-555-2003',
      address: {
        billing: {
          street: '321 Tech Boulevard',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          country: 'USA'
        }
      },
      type: 'business',
      businessInfo: {
        companyName: 'TechCorp Solutions',
        taxId: '98-7654321',
        website: 'https://techcorpsolutions.com'
      },
      totalPurchases: {
        count: 120,
        amount: 25000.00
      },
      lastPurchase: new Date('2024-01-12'),
      creditLimit: 25000,
      paymentTerms: 45,
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'CUST000005',
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@personal.com',
      phone: '+1-555-2004',
      address: {
        billing: {
          street: '654 Oak Street',
          city: 'Austin',
          state: 'TX',
          zipCode: '73301',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1990-07-08'),
      gender: 'female',
      totalPurchases: {
        count: 8,
        amount: 750.00
      },
      lastPurchase: new Date('2024-01-03'),
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'CUST000006',
      firstName: 'David',
      lastName: 'Chen',
      email: 'david.chen@startup.io',
      phone: '+1-555-2005',
      address: {
        billing: {
          street: '987 Innovation Drive',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'USA'
        }
      },
      type: 'business',
      businessInfo: {
        companyName: 'StartupTech Inc',
        taxId: '55-1234567',
        website: 'https://startuptech.io'
      },
      totalPurchases: {
        count: 25,
        amount: 3200.00
      },
      lastPurchase: new Date('2024-01-09'),
      creditLimit: 5000,
      paymentTerms: 15,
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'CUST000007',
      firstName: 'Emily',
      lastName: 'Brown',
      email: 'emily.brown@freelance.com',
      phone: '+1-555-2006',
      address: {
        billing: {
          street: '147 Creative Lane',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1992-12-03'),
      gender: 'female',
      totalPurchases: {
        count: 5,
        amount: 450.00
      },
      lastPurchase: new Date('2024-01-02'),
      isActive: true,
      isVerified: false,
      createdBy: users[0]._id
    },
    {
      customerCode: 'CUST000008',
      firstName: 'Michael',
      lastName: 'Davis',
      email: 'michael.davis@retail.com',
      phone: '+1-555-2007',
      address: {
        billing: {
          street: '258 Commerce Street',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        }
      },
      type: 'business',
      businessInfo: {
        companyName: 'Davis Retail Group',
        taxId: '77-9876543',
        website: 'https://davisretail.com'
      },
      totalPurchases: {
        count: 85,
        amount: 15000.00
      },
      lastPurchase: new Date('2024-01-11'),
      creditLimit: 20000,
      paymentTerms: 30,
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    }
  ]);

  // Products
  const products = await Product.insertMany([
    {
      name: 'Wireless Mouse',
      sku: 'MOU-001',
      description: 'Ergonomic wireless mouse with 2.4GHz connectivity',
      category: catMice._id,
      pricing: {
        costPrice: 10.00,
        sellingPrice: 19.99,
        currency: 'USD',
        markup: 99.9,
        taxRate: 10,
      },
      inventory: {
        currentStock: 150,
        minStock: 20,
        maxStock: 500,
        unit: 'pcs',
        reorderLevel: 25,
        warehouseLocation: {
          zone: 'A',
          aisle: '01',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[0]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Mechanical Keyboard',
      sku: 'KEY-002',
      description: 'RGB backlit mechanical keyboard with blue switches',
      category: catKeyboards._id,
      pricing: {
        costPrice: 35.00,
        sellingPrice: 69.99,
        currency: 'USD',
        markup: 99.97,
        taxRate: 10,
      },
      inventory: {
        currentStock: 80,
        minStock: 10,
        maxStock: 200,
        unit: 'pcs',
        reorderLevel: 15,
        warehouseLocation: {
          zone: 'A',
          aisle: '02',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[0]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Office Chair',
      sku: 'CHAIR-001',
      description: 'Ergonomic office chair with lumbar support',
      category: catChairs._id,
      pricing: {
        costPrice: 120.00,
        sellingPrice: 199.99,
        currency: 'USD',
        markup: 66.66,
        taxRate: 15,
      },
      inventory: {
        currentStock: 25,
        minStock: 5,
        maxStock: 100,
        unit: 'pcs',
        reorderLevel: 8,
        warehouseLocation: {
          zone: 'B',
          aisle: '01',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[1]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Car Battery',
      sku: 'BAT-001',
      description: '12V 60Ah automotive battery',
      category: catBatteries._id,
      pricing: {
        costPrice: 80.00,
        sellingPrice: 129.99,
        currency: 'USD',
        markup: 62.49,
        taxRate: 12,
      },
      inventory: {
        currentStock: 40,
        minStock: 10,
        maxStock: 150,
        unit: 'pcs',
        reorderLevel: 15,
        warehouseLocation: {
          zone: 'C',
          aisle: '01',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[2]._id,
      isActive: true,
      createdBy: users[0]._id
    }
  ]);

  // Accounts
  const accounts = await Account.insertMany([
    {
      name: 'Cash Account',
      type: 'asset',
      category: 'current_asset',
      code: 'CASH-001',
      description: 'Main cash account for daily operations',
      openingBalance: 5000.00,
      currentBalance: 5000.00,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Bank Account',
      type: 'asset',
      category: 'current_asset',
      code: 'BANK-001',
      description: 'Primary business checking account',
      openingBalance: 25000.00,
      currentBalance: 25000.00,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Accounts Receivable',
      type: 'asset',
      category: 'current_asset',
      code: 'AR-001',
      description: 'Outstanding customer payments',
      openingBalance: 0.00,
      currentBalance: 0.00,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Inventory',
      type: 'asset',
      category: 'current_asset',
      code: 'INV-001',
      description: 'Current inventory value',
      openingBalance: 0.00,
      currentBalance: 0.00,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Sales Revenue',
      type: 'revenue',
      category: 'general',
      code: 'REV-001',
      description: 'Product sales revenue',
      openingBalance: 0.00,
      currentBalance: 0.00,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    }
  ]);

  // Stock Movements
  const stockMovements = await StockMovement.insertMany([
    {
      product: products[0]._id,
      movementType: 'in',
      quantity: 100,
      unitCost: 10.00,
      totalCost: 1000.00,
      previousStock: 0,
      newStock: 100,
      reason: 'Initial stock purchase',
      createdBy: users[0]._id
    },
    {
      product: products[1]._id,
      movementType: 'in',
      quantity: 50,
      unitCost: 35.00,
      totalCost: 1750.00,
      previousStock: 0,
      newStock: 50,
      reason: 'Initial stock purchase',
      createdBy: users[0]._id
    },
    {
      product: products[0]._id,
      movementType: 'in',
      quantity: 50,
      unitCost: 10.00,
      totalCost: 500.00,
      previousStock: 100,
      newStock: 150,
      reason: 'Restock order',
      createdBy: users[0]._id
    },
    {
      product: products[1]._id,
      movementType: 'in',
      quantity: 30,
      unitCost: 35.00,
      totalCost: 1050.00,
      previousStock: 50,
      newStock: 80,
      reason: 'Restock order',
      createdBy: users[0]._id
    }
  ]);

  // Invoices (including phone-based linking examples)
  const invoices = await Invoice.insertMany([
    {
      invoiceNumber: 'INV-2024-01-0001',
      customer: customers[0]._id,
      customerPhone: customers[0].phone,
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          sku: 'MOU-001',
          quantity: 2,
          unitPrice: 19.99,
          total: 39.98
        }
      ],
      subtotal: 39.98,
      taxRate: 10,
      taxAmount: 3.998,
      total: 43.978,
      status: 'paid',
      paymentMethod: 'cash',
      shipping: { cost: 0 },
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: users[1]._id
    },
    {
      invoiceNumber: 'INV-2024-01-0002',
      customer: customers[1]._id,
      customerPhone: customers[1].phone,
      items: [
        {
          product: products[1]._id,
          name: products[1].name,
          sku: 'KEY-002',
          quantity: 1,
          unitPrice: 69.99,
          total: 69.99
        },
        {
          product: products[2]._id,
          name: products[2].name,
          sku: 'CHAIR-001',
          quantity: 1,
          unitPrice: 199.99,
          total: 199.99
        }
      ],
      subtotal: 269.98,
      taxRate: 10,
      taxAmount: 26.998,
      total: 296.978,
      status: 'pending',
      paymentMethod: 'credit_card',
      shipping: { cost: 0 },
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: users[1]._id
    },
    // Phone-based invoice (no customer object, just phone number)
    {
      invoiceNumber: 'INV-2024-01-0003',
      customer: null, // No customer object
      customerPhone: '+1-555-2000', // Phone-based linking
      customerName: 'Alice Customer',
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          sku: 'MOU-001',
          quantity: 1,
          unitPrice: 19.99,
          total: 19.99
        }
      ],
      subtotal: 19.99,
      taxRate: 10,
      taxAmount: 1.999,
      total: 21.989,
      status: 'paid',
      paymentMethod: 'cash',
      shipping: { cost: 0 },
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: users[2]._id
    },
    // Another phone-based invoice
    {
      invoiceNumber: 'INV-2024-01-0004',
      customer: null, // No customer object
      customerPhone: '+1-555-2002', // Phone-based linking
      customerName: 'Bob Customer',
      items: [
        {
          product: products[3]._id,
          name: products[3].name,
          sku: 'BAT-001',
          quantity: 1,
          unitPrice: 129.99,
          total: 129.99
        }
      ],
      subtotal: 129.99,
      taxRate: 12,
      taxAmount: 15.599,
      total: 145.589,
      status: 'paid',
      paymentMethod: 'credit_card',
      shipping: { cost: 0 },
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: users[2]._id
    }
  ]);

  // Transactions
  const transactions = await Transaction.insertMany([
    {
      transactionNumber: 'SAL000001',
      type: 'sale',
      amount: 43.978,
      currency: 'USD',
      description: 'Sale of 2x Wireless Mouse',
      reference: invoices[0]._id.toString(),
      entries: [
        { account: accounts[0]._id, debit: 43.978, description: 'Cash received' },
        { account: accounts[4]._id, credit: 43.978, description: 'Sales revenue' }
      ],
      status: 'approved',
      createdBy: users[1]._id
    },
    {
      transactionNumber: 'PUR000001',
      type: 'purchase',
      amount: 1000.00,
      currency: 'USD',
      description: 'Purchase of 100x Wireless Mouse',
      reference: stockMovements[0]._id.toString(),
      entries: [
        { account: accounts[3]._id, debit: 1000.00, description: 'Inventory increase' },
        { account: accounts[1]._id, credit: 1000.00, description: 'Bank payment' }
      ],
      status: 'approved',
      createdBy: users[0]._id
    }
  ]);

  // Support Tickets
  const supportTickets = await Support.insertMany([
    {
      ticketNumber: 'TKT000001',
      subject: 'Login Issues',
      description: 'Unable to login to the system',
      priority: 'high',
      status: 'open',
      category: 'technical',
      customer: customers[0]._id,
      assignedTo: users[0]._id,
      createdBy: users[0]._id
    },
    {
      ticketNumber: 'TKT000002',
      subject: 'Product Inquiry',
      description: 'Need information about mechanical keyboards',
      priority: 'medium',
      status: 'in_progress',
      category: 'general',
      customer: customers[1]._id,
      assignedTo: users[1]._id,
      createdBy: users[0]._id
    }
  ]);

  // Workshop Jobs (including phone-based linking examples)
  const workshopJobs = await WorkshopJob.insertMany([
    {
      title: 'Car Battery Replacement',
      description: 'Replace old battery with new 12V 60Ah battery',
      customer: customers[2]._id,
      priority: 'medium',
      status: 'scheduled',
      vehicle: {
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        odometer: 45000,
        regNumber: 'ABC-123',
        vinNumber: '1HGBH41JXMN109186'
      },
      repairRequest: 'Battery not holding charge, needs replacement',
      scheduled: {
        start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)
      },
      parts: [
        { product: products[3]._id, quantityRequired: 1, quantityUsed: 0 }
      ],
      createdBy: users[2]._id
    },
    {
      title: 'Keyboard Replacement',
      description: 'Replace faulty mechanical keyboard',
      customer: customers[0]._id,
      priority: 'high',
      status: 'in_progress',
      vehicle: {
        make: 'N/A',
        model: 'Desktop',
        year: 2021,
        odometer: 0,
        regNumber: 'N/A',
        vinNumber: 'N/A'
      },
      repairRequest: 'Some keys not working properly',
      parts: [
        { product: products[1]._id, quantityRequired: 1, quantityUsed: 0 }
      ],
      createdBy: users[1]._id
    },
    {
      title: 'Office Chair Repair',
      description: 'Fix lumbar support and tighten screws',
      customer: customers[1]._id,
      priority: 'low',
      status: 'on_hold',
      vehicle: {
        make: 'N/A',
        model: 'Office Chair',
        year: 2022,
        odometer: 0,
        regNumber: 'N/A',
        vinNumber: 'N/A'
      },
      repairRequest: 'Chair is squeaking and support is loose',
      parts: [
        { product: products[2]._id, quantityRequired: 1, quantityUsed: 0 }
      ],
      createdBy: users[0]._id
    },
    {
      title: 'Mouse Replacement',
      description: 'Replace unresponsive wireless mouse',
      customer: customers[0]._id,
      priority: 'medium',
      status: 'draft',
      vehicle: {
        make: 'N/A',
        model: 'Desktop',
        year: 2020,
        odometer: 0,
        regNumber: 'N/A',
        vinNumber: 'N/A'
      },
      repairRequest: 'Mouse left click intermittently fails',
      parts: [
        { product: products[0]._id, quantityRequired: 1, quantityUsed: 0 }
      ],
      createdBy: users[2]._id
    },
    // Phone-based workshop jobs (no customer object, just phone number)
    {
      title: 'Laptop Screen Repair',
      description: 'Replace cracked laptop screen',
      customer: null, // No customer object
      customerPhone: '+1-555-2000', // Phone-based linking
      priority: 'high',
      status: 'in_progress',
      vehicle: {
        make: 'Dell',
        model: 'Inspiron 15',
        year: 2022,
        odometer: 0,
        regNumber: 'N/A',
        vinNumber: 'N/A'
      },
      repairRequest: 'Screen cracked after accidental drop',
      parts: [
        { product: products[1]._id, quantityRequired: 1, quantityUsed: 0 }
      ],
      createdBy: users[1]._id
    },
    {
      title: 'Desktop Setup',
      description: 'Setup new desktop computer for customer',
      customer: null, // No customer object
      customerPhone: '+1-555-2004', // Phone-based linking
      priority: 'medium',
      status: 'scheduled',
      vehicle: {
        make: 'N/A',
        model: 'Desktop PC',
        year: 2024,
        odometer: 0,
        regNumber: 'N/A',
        vinNumber: 'N/A'
      },
      repairRequest: 'Need help setting up new desktop computer',
      scheduled: {
        start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)
      },
      parts: [
        { product: products[0]._id, quantityRequired: 1, quantityUsed: 0 },
        { product: products[1]._id, quantityRequired: 1, quantityUsed: 0 }
      ],
      createdBy: users[2]._id
    }
  ]);

  // Customer Inquiries
  const customerInquiries = await CustomerInquiry.insertMany([
    {
      inquiryNumber: 'INQ-2024-001',
      customer: customers[0]._id,
      customerName: `${customers[0].firstName} ${customers[0].lastName}`,
      customerEmail: customers[0].email,
      customerPhone: customers[0].phone,
      subject: 'Wireless Mouse Inquiry',
      description: 'I need information about wireless mice for my office setup. Looking for ergonomic options with good battery life.',
      priority: 'normal',
      status: 'new',
      productsOfInterest: [
        { product: products[0]._id, quantity: 5 }
      ],
      notes: 'Customer is setting up new office',
      createdBy: users[1]._id, // Manager
      assignedTo: users[2]._id  // Employee
    },
    {
      inquiryNumber: 'INQ-2024-002',
      customer: customers[1]._id,
      customerName: `${customers[1].firstName} ${customers[1].lastName}`,
      customerEmail: customers[1].email,
      customerPhone: customers[1].phone,
      subject: 'Bulk Order for Office Equipment',
      description: 'We need to equip our new office with chairs, keyboards, and mice. Looking for volume discounts.',
      priority: 'high',
      status: 'under_review',
      productsOfInterest: [
        { product: products[2]._id, quantity: 20 },
        { product: products[1]._id, quantity: 20 },
        { product: products[0]._id, quantity: 20 }
      ],
      notes: 'Large corporate order - follow up for pricing',
      assignedTo: users[1]._id,
      createdBy: users[0]._id
    },
    {
      inquiryNumber: 'INQ-2024-003',
      customer: customers[2]._id,
      customerName: `${customers[2].firstName} ${customers[2].lastName}`,
      customerEmail: customers[2].email,
      customerPhone: customers[2].phone,
      subject: 'Car Battery Replacement',
      description: 'My car battery died and I need a replacement. What options do you have available?',
      priority: 'urgent',
      status: 'converted_to_order',
      productsOfInterest: [
        { product: products[3]._id, quantity: 1 }
      ],
      notes: 'Customer needs immediate replacement',
      createdBy: users[2]._id,
      assignedTo: users[4]._id // Warehouse Manager
    },
    {
      inquiryNumber: 'INQ-2024-004',
      customer: customers[0]._id,
      customerName: `${customers[0].firstName} ${customers[0].lastName}`,
      customerEmail: customers[0].email,
      customerPhone: customers[0].phone,
      subject: 'Gaming Setup Consultation',
      description: 'I want to build a gaming setup and need advice on monitors, keyboards, and mice.',
      priority: 'normal',
      status: 'closed',
      productsOfInterest: [
        { product: products[3]._id, quantity: 1 },
        { product: products[0]._id, quantity: 1 }
      ],
      notes: 'Customer converted to quotation',
      createdBy: users[1]._id,
      assignedTo: users[2]._id,
      resolutionDate: new Date()
    },
    {
      inquiryNumber: 'INQ-2024-005',
      customer: customers[1]._id,
      customerName: `${customers[1].firstName} ${customers[1].lastName}`,
      customerEmail: customers[1].email,
      customerPhone: customers[1].phone,
      subject: 'Office Chair Warranty Claim',
      description: 'My office chair broke after 6 months. What is the warranty process?',
      priority: 'high',
      status: 'closed',
      productsOfInterest: [
        { product: products[2]._id, quantity: 1 }
      ],
      notes: 'Warranty claim processed - replacement sent',
      createdBy: users[2]._id,
      assignedTo: users[1]._id,
      resolutionDate: new Date()
    }
  ]);

  // Quotations
  const quotations = await Quotation.insertMany([
    {
      quotationNumber: 'QUO-2024-001',
      customer: customers[0]._id,
      customerName: `${customers[0].firstName} ${customers[0].lastName}`,
      customerEmail: customers[0].email,
      customerPhone: customers[0].phone,
      quotationDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          sku: products[0].sku,
          quantity: 5,
          unitPrice: products[0].pricing.sellingPrice,
          total: products[0].pricing.sellingPrice * 5
        }
      ],
      subtotal: products[0].pricing.sellingPrice * 5,
      taxRate: 10,
      taxAmount: (products[0].pricing.sellingPrice * 5) * 0.1,
      total: (products[0].pricing.sellingPrice * 5) * 1.1,
      status: 'accepted',
      notes: 'Volume discount applied',
      createdBy: users[1]._id, // Manager
      assignedTo: users[2]._id  // Employee
    },
    {
      quotationNumber: 'QUO-2024-002',
      customer: customers[1]._id,
      customerName: `${customers[1].firstName} ${customers[1].lastName}`,
      customerEmail: customers[1].email,
      customerPhone: customers[1].phone,
      quotationDate: new Date(),
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[2]._id,
          name: products[2].name,
          sku: products[2].sku,
          quantity: 20,
          unitPrice: products[2].pricing.sellingPrice * 0.9, // 10% discount
          total: products[2].pricing.sellingPrice * 0.9 * 20
        },
        {
          product: products[1]._id,
          name: products[1].name,
          sku: products[1].sku,
          quantity: 20,
          unitPrice: products[1].pricing.sellingPrice * 0.9, // 10% discount
          total: products[1].pricing.sellingPrice * 0.9 * 20
        },
        {
          product: products[0]._id,
          name: products[0].name,
          sku: products[0].sku,
          quantity: 20,
          unitPrice: products[0].pricing.sellingPrice * 0.9, // 10% discount
          total: products[0].pricing.sellingPrice * 0.9 * 20
        }
      ],
      subtotal: (products[2].pricing.sellingPrice * 0.9 * 20) + (products[1].pricing.sellingPrice * 0.9 * 20) + (products[0].pricing.sellingPrice * 0.9 * 20),
      taxRate: 10,
      taxAmount: ((products[2].pricing.sellingPrice * 0.9 * 20) + (products[1].pricing.sellingPrice * 0.9 * 20) + (products[0].pricing.sellingPrice * 0.9 * 20)) * 0.1,
      total: ((products[2].pricing.sellingPrice * 0.9 * 20) + (products[1].pricing.sellingPrice * 0.9 * 20) + (products[0].pricing.sellingPrice * 0.9 * 20)) * 1.1,
      status: 'sent',
      notes: 'Corporate bulk order - awaiting approval',
      createdBy: users[1]._id,
      assignedTo: users[1]._id // Manager
    },
    {
      quotationNumber: 'QUO-2024-003',
      customer: customers[2]._id,
      customerName: `${customers[2].firstName} ${customers[2].lastName}`,
      customerEmail: customers[2].email,
      customerPhone: customers[2].phone,
      quotationDate: new Date(),
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[3]._id,
          name: products[3].name,
          sku: products[3].sku,
          quantity: 1,
          unitPrice: products[3].pricing.sellingPrice,
          total: products[3].pricing.sellingPrice
        }
      ],
      subtotal: products[3].pricing.sellingPrice,
      taxRate: 10,
      taxAmount: products[3].pricing.sellingPrice * 0.1,
      total: products[3].pricing.sellingPrice * 1.1,
      status: 'rejected',
      notes: 'Customer found better price elsewhere',
      createdBy: users[2]._id,
      assignedTo: users[2]._id
    },
    {
      quotationNumber: 'QUO-2024-004',
      customer: customers[0]._id,
      customerName: `${customers[0].firstName} ${customers[0].lastName}`,
      customerEmail: customers[0].email,
      customerPhone: customers[0].phone,
      quotationDate: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[3]._id,
          name: products[3].name,
          sku: products[3].sku,
          quantity: 2,
          unitPrice: products[3].pricing.sellingPrice,
          total: products[3].pricing.sellingPrice * 2
        }
      ],
      subtotal: products[3].pricing.sellingPrice * 2,
      taxRate: 10,
      taxAmount: (products[3].pricing.sellingPrice * 2) * 0.1,
      total: (products[3].pricing.sellingPrice * 2) * 1.1,
      status: 'expired',
      notes: 'Quote expired - customer did not respond',
      createdBy: users[1]._id,
      assignedTo: users[2]._id
    }
  ]);

  // Orders
  const orders = await Order.insertMany([
    {
      orderNumber: 'ORD-2024-001',
      customer: customers[0]._id,
      customerName: `${customers[0].firstName} ${customers[0].lastName}`,
      customerEmail: customers[0].email,
      customerPhone: customers[0].phone,
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          sku: products[0].sku,
          quantity: 5,
          unitPrice: products[0].pricing.sellingPrice,
          total: products[0].pricing.sellingPrice * 5
        }
      ],
      subtotal: products[0].pricing.sellingPrice * 5,
      taxRate: 10,
      taxAmount: (products[0].pricing.sellingPrice * 5) * 0.1,
      total: (products[0].pricing.sellingPrice * 5) * 1.1,
      status: 'confirmed',
      paymentStatus: 'pending',
      shippingAddress: customers[0].address.billing,
      notes: 'Order confirmed from quotation',
      createdBy: users[1]._id,
      assignedTo: users[4]._id // Warehouse Manager
    },
    {
      orderNumber: 'ORD-2024-002',
      customer: customers[1]._id,
      customerName: `${customers[1].firstName} ${customers[1].lastName}`,
      customerEmail: customers[1].email,
      customerPhone: customers[1].phone,
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[2]._id,
          name: products[2].name,
          sku: products[2].sku,
          quantity: 10,
          unitPrice: products[2].pricing.sellingPrice,
          total: products[2].pricing.sellingPrice * 10
        }
      ],
      subtotal: products[2].pricing.sellingPrice * 10,
      taxRate: 10,
      taxAmount: (products[2].pricing.sellingPrice * 10) * 0.1,
      total: (products[2].pricing.sellingPrice * 10) * 1.1,
      status: 'processing',
      paymentStatus: 'paid',
      shippingAddress: customers[1].address.billing,
      notes: 'Corporate order - priority shipping',
      createdBy: users[1]._id,
      assignedTo: users[4]._id
    },
    {
      orderNumber: 'ORD-2024-003',
      customer: customers[2]._id,
      customerName: `${customers[2].firstName} ${customers[2].lastName}`,
      customerEmail: customers[2].email,
      customerPhone: customers[2].phone,
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[3]._id,
          name: products[3].name,
          sku: products[3].sku,
          quantity: 1,
          unitPrice: products[3].pricing.sellingPrice,
          total: products[3].pricing.sellingPrice
        }
      ],
      subtotal: products[3].pricing.sellingPrice,
      taxRate: 10,
      taxAmount: products[3].pricing.sellingPrice * 0.1,
      total: products[3].pricing.sellingPrice * 1.1,
      status: 'shipped',
      paymentStatus: 'paid',
      shippingAddress: customers[2].address.billing,
      notes: 'Express delivery requested',
      createdBy: users[2]._id,
      assignedTo: users[4]._id
    }
  ]);

  // Deliveries
  const deliveries = await Delivery.insertMany([
    {
      deliveryNumber: 'DEL-2024-001',
      order: orders[0]._id,
      orderNumber: orders[0].orderNumber,
      customer: customers[0]._id,
      customerName: `${customers[0].firstName} ${customers[0].lastName}`,
      customerPhone: customers[0].phone,
      scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          sku: products[0].sku,
          quantity: 5,
          unitPrice: products[0].pricing.sellingPrice,
          total: products[0].pricing.sellingPrice * 5
        }
      ],
      subtotal: products[0].pricing.sellingPrice * 5,
      taxAmount: (products[0].pricing.sellingPrice * 5) * 0.1,
      totalAmount: (products[0].pricing.sellingPrice * 5) * 1.1,
      status: 'preparing',
      assignedTo: users[2]._id,
      deliveryAddress: customers[0].address.billing,
      notes: 'Standard delivery',
      createdBy: users[1]._id,
      assignedTo: users[4]._id // Warehouse Manager
    },
    {
      deliveryNumber: 'DEL-2024-002',
      order: orders[1]._id,
      orderNumber: orders[1].orderNumber,
      customer: customers[1]._id,
      customerName: `${customers[1].firstName} ${customers[1].lastName}`,
      customerPhone: customers[1].phone,
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      items: [
        {
          product: products[2]._id,
          name: products[2].name,
          sku: products[2].sku,
          quantity: 10,
          unitPrice: products[2].pricing.sellingPrice,
          total: products[2].pricing.sellingPrice * 10
        }
      ],
      subtotal: products[2].pricing.sellingPrice * 10,
      taxAmount: (products[2].pricing.sellingPrice * 10) * 0.1,
      totalAmount: (products[2].pricing.sellingPrice * 10) * 1.1,
      status: 'in_transit',
      assignedTo: users[4]._id,
      deliveryAddress: customers[1].address.billing,
      notes: 'Priority delivery - corporate client',
      createdBy: users[1]._id,
      trackingNumber: 'TRK123456789'
    },
    {
      deliveryNumber: 'DEL-2024-003',
      order: orders[2]._id,
      orderNumber: orders[2].orderNumber,
      customer: customers[2]._id,
      customerName: `${customers[2].firstName} ${customers[2].lastName}`,
      customerPhone: customers[2].phone,
      scheduledDate: new Date(),
      items: [
        {
          product: products[3]._id,
          name: products[3].name,
          sku: products[3].sku,
          quantity: 1,
          unitPrice: products[3].pricing.sellingPrice,
          total: products[3].pricing.sellingPrice
        }
      ],
      subtotal: products[3].pricing.sellingPrice,
      taxAmount: products[3].pricing.sellingPrice * 0.1,
      totalAmount: products[3].pricing.sellingPrice * 1.1,
      status: 'delivered',
      assignedTo: users[4]._id,
      deliveryAddress: customers[2].address.billing,
      notes: 'Express delivery completed',
      createdBy: users[2]._id,
      trackingNumber: 'TRK987654321',
      deliveredAt: new Date()
    }
  ]);

  // Stock Alerts
  const stockAlerts = await StockAlert.insertMany([
    {
      product: products[0]._id,
      productName: products[0].name,
      sku: products[0].sku,
      alertType: 'low_stock',
      severity: 'high',
      currentStock: products[0].inventory.currentStock,
      threshold: 20,
      message: `${products[0].name} (${products[0].sku}) is running low (${products[0].inventory.currentStock} units remaining)`,
      isResolved: false,
      autoGenerated: true,
      createdBy: users[0]._id
    },
    {
      product: products[1]._id,
      productName: products[1].name,
      sku: products[1].sku,
      alertType: 'reorder_point',
      severity: 'medium',
      currentStock: products[1].inventory.currentStock,
      threshold: 15,
      message: `${products[1].name} (${products[1].sku}) has reached reorder point`,
      isResolved: false,
      autoGenerated: true,
      createdBy: users[0]._id,
      assignedTo: users[4]._id // Warehouse Manager
    },
    {
      product: products[2]._id,
      productName: products[2].name,
      sku: products[2].sku,
      alertType: 'out_of_stock',
      severity: 'critical',
      currentStock: 0,
      threshold: 5,
      message: `${products[2].name} (${products[2].sku}) is out of stock`,
      isResolved: false,
      autoGenerated: true,
      createdBy: users[0]._id,
      assignedTo: users[4]._id
    },
    {
      product: products[3]._id,
      productName: products[3].name,
      sku: products[3].sku,
      alertType: 'expiring_soon',
      severity: 'medium',
      currentStock: products[3].inventory.currentStock,
      threshold: 30,
      message: `${products[3].name} (${products[3].sku}) expires in 30 days`,
      isResolved: false,
      autoGenerated: true,
      createdBy: users[0]._id,
      assignedTo: users[4]._id
    },
    {
      product: products[3]._id,
      productName: products[3].name,
      sku: products[3].sku,
      alertType: 'overstock',
      severity: 'low',
      currentStock: products[3].inventory.currentStock,
      threshold: 200,
      message: `${products[3].name} (${products[3].sku}) has excess inventory`,
      isResolved: true,
      autoGenerated: true,
      createdBy: users[0]._id,
      assignedTo: users[4]._id,
      resolvedAt: new Date(),
      resolvedBy: users[4]._id
    }
  ]);

  console.log('✅ Settings created');
  console.log(`👥 Seeded ${users.length} users (4 staff + 3 customers)`);
  console.log(`📦 Seeded ${[catElectronics, catOffice, catAutomotive, catMice, catKeyboards, catChairs, catBatteries].length} categories`);
  console.log(`🏢 Seeded ${suppliers.length} suppliers`);
  console.log(`👤 Seeded ${customers.length} customers`);
  console.log(`📦 Seeded ${products.length} products`);
  console.log(`💰 Seeded ${accounts.length} accounts`);
  console.log(`📊 Seeded ${stockMovements.length} stock movements`);
  console.log(`🧾 Seeded ${invoices.length} invoices`);
  console.log(`💳 Seeded ${transactions.length} transactions`);
  console.log(`🎫 Seeded ${supportTickets.length} support tickets`);
  console.log(`🔧 Seeded ${workshopJobs.length} workshop jobs`);
  console.log(`📋 Seeded ${customerInquiries.length} customer inquiries`);
  console.log(`📄 Seeded ${quotations.length} quotations`);
  console.log(`📦 Seeded ${orders.length} orders`);
  console.log(`🚚 Seeded ${deliveries.length} deliveries`);
  console.log(`⚠️ Seeded ${stockAlerts.length} stock alerts`);

  // Display login information
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('═'.repeat(50));
  
  // Staff users
  console.log('\n👨‍💼 STAFF ACCOUNTS:');
  console.log('─'.repeat(30));
  users.slice(0, 4).forEach((user, index) => {
    const roleNames = ['Super Admin', 'Manager', 'Employee', 'Warehouse Manager'];
    console.log(`${roleNames[index]}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: password123`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Phone: ${user.phone || 'N/A'}`);
    console.log('');
  });

  // Customer users
  console.log('👤 CUSTOMER ACCOUNTS:');
  console.log('─'.repeat(30));
  users.slice(4).forEach((user, index) => {
    const customerNames = ['Alice Customer', 'Bob Customer', 'Maria Customer'];
    console.log(`${customerNames[index]}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: password123`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Phone: ${user.phone || 'N/A'}`);
    console.log(`  Wallet: $${user.wallet?.balance || 0} ${user.wallet?.currency || 'USD'}`);
    console.log('');
  });

  console.log('═'.repeat(50));
  console.log('💡 TIP: All users use the same password: "password123"');
  console.log('🌐 Access the application at: http://localhost:3000');
  console.log('');
  console.log('📋 ROLE PERMISSIONS:');
  console.log('─'.repeat(30));
  console.log('Super Admin: Full access to all features');
  console.log('Manager: Can create employees and customers, manage most features');
  console.log('Employee: Can use POS, manage customers, view reports');
  console.log('Customer: Access to customer dashboard, purchases, wallet, support');
  console.log('');
  console.log('🔗 PHONE-BASED LINKING:');
  console.log('─'.repeat(30));
  console.log('• Customer phone numbers match between user accounts and customer records');
  console.log('• POS and Workshop jobs can be created with phone numbers only');
  console.log('• Automatic linking when customers register with existing phone numbers');
  console.log('');
  console.log('📈 SALES & WAREHOUSE PROCESS FLOW:');
  console.log('─'.repeat(30));
  console.log('• Customer Inquiries: Track customer requests and convert to quotations');
  console.log('• Quotations: Generate quotes with inventory checking and approval workflow');
  console.log('• Orders: Convert approved quotations to confirmed orders');
  console.log('• Deliveries: Track order fulfillment and delivery status');
  console.log('• Stock Alerts: Monitor inventory levels and generate replenishment suggestions');
  console.log('• Warehouse Dashboard: Monitor operations, alerts, and delivery statistics');
  console.log('═'.repeat(50));

  await mongoose.connection.close();
  console.log('✅ Seed complete. Connection closed.');
}

seed().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});


