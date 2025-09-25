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
      role: 'super_admin',
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
      loyalty: {
        points: 1250,
        tier: 'silver',
        joinDate: new Date('2023-01-15')
      },
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
      loyalty: {
        points: 5000,
        tier: 'gold',
        joinDate: new Date('2022-08-20')
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
      loyalty: {
        points: 250,
        tier: 'bronze',
        joinDate: new Date('2023-12-01')
      },
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
      loyalty: {
        points: 15000,
        tier: 'platinum',
        joinDate: new Date('2021-05-10')
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
      loyalty: {
        points: 750,
        tier: 'bronze',
        joinDate: new Date('2023-09-15')
      },
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
      loyalty: {
        points: 3200,
        tier: 'silver',
        joinDate: new Date('2023-03-20')
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
      loyalty: {
        points: 450,
        tier: 'bronze',
        joinDate: new Date('2023-11-10')
      },
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
      loyalty: {
        points: 8500,
        tier: 'gold',
        joinDate: new Date('2022-11-05')
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
        reorderLevel: 25
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
        reorderLevel: 15
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
        reorderLevel: 8
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
        reorderLevel: 15
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

  console.log('✅ Settings created');
  console.log(`👥 Seeded ${users.length} users (3 staff + 3 customers)`);
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

  // Display login information
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('═'.repeat(50));
  
  // Staff users
  console.log('\n👨‍💼 STAFF ACCOUNTS:');
  console.log('─'.repeat(30));
  users.slice(0, 3).forEach((user, index) => {
    const roleNames = ['Super Admin', 'Manager', 'Employee'];
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
  users.slice(3).forEach((user, index) => {
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
  console.log('═'.repeat(50));

  await mongoose.connection.close();
  console.log('✅ Seed complete. Connection closed.');
}

seed().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});


