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
const Warehouse = require('./models/Warehouse');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-system';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
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
    Warehouse.deleteMany({}),
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
      name: 'TechFlow Solutions',
      code: 'TFS001',
      taxId: '98-7654321',
      website: 'https://techflowsolutions.com',
      email: 'info@techflowsolutions.com',
      phone: '+1-555-0199',
      logo: { url: 'https://dummyimage.com/200x60/2563EB/ffffff&text=TechFlow' },
      address: {
        street: '456 Innovation Drive',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        country: 'USA'
      },
      defaultCurrency: 'USD',
      defaultTaxRate: 8.25,
      invoiceSettings: {
        prefix: 'TF',
        numberFormat: 'TF-{YYYY}-{MM}-{####}',
        footerText: 'Thank you for choosing TechFlow Solutions!',
        termsAndConditions: 'Payment due within 15 days. Late payments subject to 1.5% monthly service charge.'
      },
      posSettings: {
        receiptHeader: 'TechFlow Solutions - Your Tech Partner',
        receiptFooter: 'Visit us online at techflowsolutions.com for support!',
        showTaxBreakdown: true,
        autoPrint: true
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
      firstName: 'Alexandra',
      lastName: 'Chen',
      email: 'alexandra.chen@techflowsolutions.com',
      password: 'password123',
      role: 'admin',
      phone: '+1-512-555-0100',
      department: 'Technology',
      position: 'Chief Technology Officer',
      salary: { amount: 150000, currency: 'USD', paymentType: 'monthly' },
      hireDate: new Date('2022-03-01'),
      address: {
        street: '1234 Tech Valley Blvd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
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
      firstName: 'Marcus',
      lastName: 'Rodriguez',
      email: 'marcus.rodriguez@techflowsolutions.com',
      password: 'password123',
      role: 'manager',
      phone: '+1-512-555-0101',
      department: 'Sales',
      position: 'Sales Manager',
      salary: { amount: 85000, currency: 'USD', paymentType: 'monthly' },
      hireDate: new Date('2022-08-15'),
      address: {
        street: '5678 South Lamar Blvd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78704',
        country: 'USA'
      },
    },
    {
      firstName: 'Jennifer',
      lastName: 'Kim',
      email: 'jennifer.kim@techflowsolutions.com',
      password: 'password123',
      role: 'employee',
      phone: '+1-512-555-0102',
      department: 'Customer Service',
      position: 'Customer Success Specialist',
      salary: { amount: 52000, currency: 'USD', paymentType: 'monthly' },
      hireDate: new Date('2023-02-20'),
      address: {
        street: '9012 West 6th Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '78703',
        country: 'USA'
      },
    },
    {
      firstName: 'David',
      lastName: 'Thompson',
      email: 'david.thompson@techflowsolutions.com',
      password: 'password123',
      role: 'warehouse_manager',
      phone: '+1-512-555-0103',
      department: 'Operations',
      position: 'Operations Manager',
      salary: { amount: 68000, currency: 'USD', paymentType: 'monthly' },
      hireDate: new Date('2022-11-10'),
      address: {
        street: '3456 East Riverside Dr',
        city: 'Austin',
        state: 'TX',
        zipCode: '78741',
        country: 'USA'
      },
    },
    {
      firstName: 'Priya',
      lastName: 'Patel',
      email: 'priya.patel@techflowsolutions.com',
      password: 'password123',
      role: 'employee',
      phone: '+1-512-555-0104',
      department: 'Finance',
      position: 'Financial Analyst',
      salary: { amount: 58000, currency: 'USD', paymentType: 'monthly' },
      hireDate: new Date('2023-01-15'),
      address: {
        street: '7890 North Lamar Blvd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78752',
        country: 'USA'
      },
    },
    {
      firstName: 'James',
      lastName: 'Wilson',
      email: 'james.wilson@techflowsolutions.com',
      password: 'password123',
      role: 'employee',
      phone: '+1-512-555-0105',
      department: 'Technical Support',
      position: 'Technical Support Specialist',
      salary: { amount: 48000, currency: 'USD', paymentType: 'monthly' },
      hireDate: new Date('2023-04-01'),
      address: {
        street: '2345 Manor Road',
        city: 'Austin',
        state: 'TX',
        zipCode: '78722',
        country: 'USA'
      },
    },
    // Customer users (created via registration, now default to customer role)
    {
      firstName: 'Sophia',
      lastName: 'Martinez',
      email: 'sophia.martinez@gmail.com',
      password: 'password123',
      role: 'customer',
      phone: '+1-512-555-2000', // Same phone as customer record
      address: {
        street: '1234 Tech Ridge Pkwy',
        city: 'Austin',
        state: 'TX',
        zipCode: '78746',
        country: 'USA'
      },
      wallet: {
        balance: 125.50,
        currency: 'USD'
      },
      preferences: {
        language: 'en',
        timezone: 'America/Chicago',
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      }
    },
    {
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.johnson@outlook.com',
      password: 'password123',
      role: 'customer',
      phone: '+1-512-555-2001', // Same phone as customer record
      address: {
        street: '5678 Westlake Dr',
        city: 'Austin',
        state: 'TX',
        zipCode: '78746',
        country: 'USA'
      },
      wallet: {
        balance: 75.25,
        currency: 'USD'
      },
      preferences: {
        language: 'en',
        timezone: 'America/Chicago',
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      }
    },
    {
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.davis@yahoo.com',
      password: 'password123',
      role: 'customer',
      phone: '+1-512-555-2002', // Same phone as customer record
      address: {
        street: '9012 Bee Caves Rd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78746',
        country: 'USA'
      },
      wallet: {
        balance: 200.00,
        currency: 'USD'
      },
      preferences: {
        language: 'en',
        timezone: 'America/Chicago',
        notifications: {
          email: false,
          sms: false,
          push: false
        }
      }
    },
    {
      firstName: 'Ahmed',
      lastName: 'Hassan',
      email: 'ahmed.hassan@company.com',
      password: 'password123',
      role: 'customer',
      phone: '+1-512-555-2003', // Same phone as customer record
      address: {
        street: '3456 Jollyville Rd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78759',
        country: 'USA'
      },
      wallet: {
        balance: 50.00,
        currency: 'USD'
      },
      preferences: {
        language: 'en',
        timezone: 'America/Chicago',
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      }
    },
    {
      firstName: 'Lisa',
      lastName: 'Wang',
      email: 'lisa.wang@startup.io',
      password: 'password123',
      role: 'customer',
      phone: '+1-512-555-2004', // Same phone as customer record
      address: {
        street: '7890 Great Hills Trail',
        city: 'Austin',
        state: 'TX',
        zipCode: '78759',
        country: 'USA'
      },
      wallet: {
        balance: 300.75,
        currency: 'USD'
      },
      preferences: {
        language: 'en',
        timezone: 'America/Chicago',
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      }
    }
  ];

  const users = await Promise.all(
    userSeedData.map((data) => new User(data).save())
  );

  // Categories (use save() so pre-save hook sets level/path)
  const catElectronics = await new Category({
    name: 'Electronics',
    description: 'Electronic devices, components, and accessories',
    color: '#3B82F6',
    icon: 'computer',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catOffice = await new Category({
    name: 'Office & Productivity',
    description: 'Office equipment, furniture, and productivity tools',
    color: '#10B981',
    icon: 'briefcase',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catGaming = await new Category({
    name: 'Gaming & Entertainment',
    description: 'Gaming peripherals, consoles, and entertainment devices',
    color: '#F59E0B',
    icon: 'gamepad',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catNetworking = await new Category({
    name: 'Networking & Connectivity',
    description: 'Network equipment, cables, and connectivity solutions',
    color: '#8B5CF6',
    icon: 'wifi',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catAudio = await new Category({
    name: 'Audio & Video',
    description: 'Audio equipment, headphones, speakers, and video accessories',
    color: '#EF4444',
    icon: 'headphones',
    isActive: true,
    createdBy: users[0]._id
  }).save();

  // Level 2 Categories - Electronics
  const catComputers = await new Category({
    name: 'Computers & Laptops',
    description: 'Desktop computers, laptops, and workstations',
    parent: catElectronics._id,
    color: '#2563EB',
    icon: 'laptop',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catPeripherals = await new Category({
    name: 'Computer Peripherals',
    description: 'Mice, keyboards, monitors, and computer accessories',
    parent: catElectronics._id,
    color: '#1D4ED8',
    icon: 'mouse',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catMobile = await new Category({
    name: 'Mobile & Tablets',
    description: 'Smartphones, tablets, and mobile accessories',
    parent: catElectronics._id,
    color: '#1E40AF',
    icon: 'smartphone',
    isActive: true,
    createdBy: users[0]._id
  }).save();

  // Level 2 Categories - Office & Productivity
  const catFurniture = await new Category({
    name: 'Office Furniture',
    description: 'Desks, chairs, storage, and office furniture',
    parent: catOffice._id,
    color: '#059669',
    icon: 'chair',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catSupplies = await new Category({
    name: 'Office Supplies',
    description: 'Stationery, paper, pens, and office consumables',
    parent: catOffice._id,
    color: '#047857',
    icon: 'clipboard',
    isActive: true,
    createdBy: users[0]._id
  }).save();

  // Level 3 Categories - Computer Peripherals
  const catMice = await new Category({
    name: 'Mice & Pointing Devices',
    description: 'Computer mice, trackballs, and pointing devices',
    parent: catPeripherals._id,
    color: '#1E3A8A',
    icon: 'mouse-pointer',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catKeyboards = await new Category({
    name: 'Keyboards & Keypads',
    description: 'Mechanical, membrane, and specialized keyboards',
    parent: catPeripherals._id,
    color: '#1E3A8A',
    icon: 'keyboard',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catMonitors = await new Category({
    name: 'Monitors & Displays',
    description: 'Computer monitors, displays, and screen accessories',
    parent: catPeripherals._id,
    color: '#1E3A8A',
    icon: 'monitor',
    isActive: true,
    createdBy: users[0]._id
  }).save();

  // Level 3 Categories - Gaming
  const catGamingPeripherals = await new Category({
    name: 'Gaming Peripherals',
    description: 'Gaming mice, keyboards, headsets, and controllers',
    parent: catGaming._id,
    color: '#D97706',
    icon: 'gamepad-2',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catGamingConsoles = await new Category({
    name: 'Gaming Consoles',
    description: 'PlayStation, Xbox, Nintendo, and gaming consoles',
    parent: catGaming._id,
    color: '#B45309',
    icon: 'gamepad',
    isActive: true,
    createdBy: users[0]._id
  }).save();

  // Level 3 Categories - Audio & Video
  const catHeadphones = await new Category({
    name: 'Headphones & Headsets',
    description: 'Wired and wireless headphones, headsets, and earbuds',
    parent: catAudio._id,
    color: '#DC2626',
    icon: 'headphones',
    isActive: true,
    createdBy: users[0]._id
  }).save();
  const catSpeakers = await new Category({
    name: 'Speakers & Audio Systems',
    description: 'Computer speakers, soundbars, and audio systems',
    parent: catAudio._id,
    color: '#B91C1C',
    icon: 'speaker',
    isActive: true,
    createdBy: users[0]._id
  }).save();

  // Suppliers
  const suppliers = await Supplier.insertMany([
    {
      name: 'TechFlow Distribution',
      code: 'TFD001',
      businessInfo: {
        companyName: 'TechFlow Distribution LLC',
        website: 'https://techflowdist.com',
        taxId: '45-6789012'
      },
      address: {
        street: '1234 Innovation Blvd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        country: 'USA'
      },
      contactPerson: {
        firstName: 'Sarah',
        lastName: 'Williams',
        email: 'sales@techflowdist.com',
        phone: '+1-512-555-5000'
      },
      paymentTerms: 30,
      creditLimit: 100000,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Digital Edge Solutions',
      code: 'DES002',
      businessInfo: {
        companyName: 'Digital Edge Solutions Inc',
        website: 'https://digitaledge.com',
        taxId: '78-9012345'
      },
      address: {
        street: '5678 Tech Valley Dr',
        city: 'Round Rock',
        state: 'TX',
        zipCode: '78664',
        country: 'USA'
      },
      contactPerson: {
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'procurement@digitaledge.com',
        phone: '+1-512-555-5001'
      },
      paymentTerms: 15,
      creditLimit: 75000,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Gaming Gear Pro',
      code: 'GGP003',
      businessInfo: {
        companyName: 'Gaming Gear Professional',
        website: 'https://gaminggearpro.com',
        taxId: '23-4567890'
      },
      address: {
        street: '9012 Gaming Plaza',
        city: 'Cedar Park',
        state: 'TX',
        zipCode: '78613',
        country: 'USA'
      },
      contactPerson: {
        firstName: 'Alex',
        lastName: 'Rodriguez',
        email: 'wholesale@gaminggearpro.com',
        phone: '+1-512-555-5002'
      },
      paymentTerms: 20,
      creditLimit: 60000,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Audio Excellence Co',
      code: 'AEC004',
      businessInfo: {
        companyName: 'Audio Excellence Corporation',
        website: 'https://audioexcellence.com',
        taxId: '67-8901234'
      },
      address: {
        street: '3456 Sound Wave Ave',
        city: 'Pflugerville',
        state: 'TX',
        zipCode: '78660',
        country: 'USA'
      },
      contactPerson: {
        firstName: 'Jennifer',
        lastName: 'Taylor',
        email: 'orders@audioexcellence.com',
        phone: '+1-512-555-5003'
      },
      paymentTerms: 25,
      creditLimit: 45000,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Office Solutions Plus',
      code: 'OSP005',
      businessInfo: {
        companyName: 'Office Solutions Plus LLC',
        website: 'https://officesolutionsplus.com',
        taxId: '34-5678901'
      },
      address: {
        street: '7890 Business Park Dr',
        city: 'Georgetown',
        state: 'TX',
        zipCode: '78626',
        country: 'USA'
      },
      contactPerson: {
        firstName: 'David',
        lastName: 'Kim',
        email: 'supply@officesolutionsplus.com',
        phone: '+1-512-555-5004'
      },
      paymentTerms: 30,
      creditLimit: 55000,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'Network Pro Supplies',
      code: 'NPS006',
      businessInfo: {
        companyName: 'Network Pro Supplies Inc',
        website: 'https://networkprosupplies.com',
        taxId: '89-0123456'
      },
      address: {
        street: '2345 Connectivity Blvd',
        city: 'Leander',
        state: 'TX',
        zipCode: '78641',
        country: 'USA'
      },
      contactPerson: {
        firstName: 'Priya',
        lastName: 'Patel',
        email: 'sales@networkprosupplies.com',
        phone: '+1-512-555-5005'
      },
      paymentTerms: 20,
      creditLimit: 40000,
      currency: 'USD',
      isActive: true,
      createdBy: users[0]._id
    }
  ]);

  // Warehouses
  const warehouses = await Warehouse.insertMany([
    {
      name: 'TechFlow Main Warehouse',
      code: 'TFW001',
      address: {
        street: '1234 Tech Boulevard',
        city: 'Austin',
        state: 'Texas',
        zipCode: '78701',
        country: 'USA'
      },
      contact: {
        phone: '+1-512-555-8001',
        email: 'warehouse@techflow.com',
        manager: {
          name: 'Michael Rodriguez',
          phone: '+1-512-555-8002',
          email: 'm.rodriguez@techflow.com'
        }
      },
      manager: users[4]._id, // Warehouse Manager
      capacity: {
        totalCapacity: 50000, // sq ft
        currentOccupancy: 35000,
        maxWeight: 1000000, // lbs
        currentWeight: 650000
      },
      operatingHours: {
        monday: { open: '6:00 AM', close: '10:00 PM', isOpen: true },
        tuesday: { open: '6:00 AM', close: '10:00 PM', isOpen: true },
        wednesday: { open: '6:00 AM', close: '10:00 PM', isOpen: true },
        thursday: { open: '6:00 AM', close: '10:00 PM', isOpen: true },
        friday: { open: '6:00 AM', close: '10:00 PM', isOpen: true },
        saturday: { open: '8:00 AM', close: '6:00 PM', isOpen: true },
        sunday: { open: '8:00 AM', close: '6:00 PM', isOpen: true }
      },
      features: {
        hasRefrigeration: false,
        hasFreezer: false,
        hasHazardousStorage: false,
        hasSecurity: true,
        hasClimateControl: true
      },
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'TechFlow North Warehouse',
      code: 'TFW002',
      address: {
        street: '5678 Innovation Drive',
        city: 'Round Rock',
        state: 'Texas',
        zipCode: '78681',
        country: 'USA'
      },
      contact: {
        phone: '+1-512-555-8003',
        email: 'north@techflow.com',
        manager: {
          name: 'Sarah Chen',
          phone: '+1-512-555-8004',
          email: 's.chen@techflow.com'
        }
      },
      manager: users[4]._id, // Warehouse Manager
      capacity: {
        totalCapacity: 35000,
        currentOccupancy: 22000,
        maxWeight: 750000,
        currentWeight: 480000
      },
      operatingHours: {
        monday: { open: '7:00 AM', close: '9:00 PM', isOpen: true },
        tuesday: { open: '7:00 AM', close: '9:00 PM', isOpen: true },
        wednesday: { open: '7:00 AM', close: '9:00 PM', isOpen: true },
        thursday: { open: '7:00 AM', close: '9:00 PM', isOpen: true },
        friday: { open: '7:00 AM', close: '9:00 PM', isOpen: true },
        saturday: { open: '9:00 AM', close: '5:00 PM', isOpen: true },
        sunday: { open: '9:00 AM', close: '5:00 PM', isOpen: true }
      },
      features: {
        hasRefrigeration: false,
        hasFreezer: false,
        hasHazardousStorage: false,
        hasSecurity: true,
        hasClimateControl: true
      },
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'TechFlow South Distribution Center',
      code: 'TFW003',
      address: {
        street: '9012 Logistics Lane',
        city: 'San Antonio',
        state: 'Texas',
        zipCode: '78201',
        country: 'USA'
      },
      contact: {
        phone: '+1-210-555-8005',
        email: 'south@techflow.com',
        manager: {
          name: 'David Thompson',
          phone: '+1-210-555-8006',
          email: 'd.thompson@techflow.com'
        }
      },
      manager: users[4]._id, // Warehouse Manager
      capacity: {
        totalCapacity: 75000,
        currentOccupancy: 55000,
        maxWeight: 1500000,
        currentWeight: 920000
      },
      operatingHours: {
        monday: { open: '5:00 AM', close: '11:00 PM', isOpen: true },
        tuesday: { open: '5:00 AM', close: '11:00 PM', isOpen: true },
        wednesday: { open: '5:00 AM', close: '11:00 PM', isOpen: true },
        thursday: { open: '5:00 AM', close: '11:00 PM', isOpen: true },
        friday: { open: '5:00 AM', close: '11:00 PM', isOpen: true },
        saturday: { open: '7:00 AM', close: '7:00 PM', isOpen: true },
        sunday: { open: '7:00 AM', close: '7:00 PM', isOpen: true }
      },
      features: {
        hasRefrigeration: true,
        hasFreezer: true,
        hasHazardousStorage: true,
        hasSecurity: true,
        hasClimateControl: true
      },
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'TechFlow Electronics Hub',
      code: 'TFW004',
      address: {
        street: '3456 Digital Way',
        city: 'Plano',
        state: 'Texas',
        zipCode: '75023',
        country: 'USA'
      },
      contact: {
        phone: '+1-972-555-8007',
        email: 'electronics@techflow.com',
        manager: {
          name: 'Lisa Wang',
          phone: '+1-972-555-8008',
          email: 'l.wang@techflow.com'
        }
      },
      manager: users[4]._id, // Warehouse Manager
      capacity: {
        totalCapacity: 25000,
        currentOccupancy: 18000,
        maxWeight: 500000,
        currentWeight: 320000
      },
      operatingHours: {
        monday: { open: '8:00 AM', close: '8:00 PM', isOpen: true },
        tuesday: { open: '8:00 AM', close: '8:00 PM', isOpen: true },
        wednesday: { open: '8:00 AM', close: '8:00 PM', isOpen: true },
        thursday: { open: '8:00 AM', close: '8:00 PM', isOpen: true },
        friday: { open: '8:00 AM', close: '8:00 PM', isOpen: true },
        saturday: { open: '10:00 AM', close: '4:00 PM', isOpen: true },
        sunday: { open: '10:00 AM', close: '4:00 PM', isOpen: true }
      },
      features: {
        hasRefrigeration: false,
        hasFreezer: false,
        hasHazardousStorage: false,
        hasSecurity: true,
        hasClimateControl: true
      },
      isActive: true,
      createdBy: users[0]._id
    }
  ]);

  // Customers
  const customers = await Customer.insertMany([
    {
      customerCode: 'TFS000001',
      firstName: 'Sophia',
      lastName: 'Martinez',
      email: 'sophia.martinez@gmail.com',
      phone: '+1-512-555-2000',
      address: {
        billing: {
          street: '1234 Tech Ridge Pkwy',
          city: 'Austin',
          state: 'TX',
          zipCode: '78746',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1992-08-15'),
      gender: 'female',
      totalPurchases: {
        count: 18,
        amount: 2150.75
      },
      lastPurchase: new Date('2024-01-15'),
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'TFS000002',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.johnson@outlook.com',
      phone: '+1-512-555-2001',
      address: {
        billing: {
          street: '5678 Westlake Dr',
          city: 'Austin',
          state: 'TX',
          zipCode: '78746',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1987-04-22'),
      gender: 'male',
      totalPurchases: {
        count: 12,
        amount: 1850.25
      },
      lastPurchase: new Date('2024-01-12'),
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'TFS000003',
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.davis@yahoo.com',
      phone: '+1-512-555-2002',
      address: {
        billing: {
          street: '9012 Bee Caves Rd',
          city: 'Austin',
          state: 'TX',
          zipCode: '78746',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1995-11-08'),
      gender: 'female',
      totalPurchases: {
        count: 8,
        amount: 1200.00
      },
      lastPurchase: new Date('2024-01-10'),
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'TFS000004',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      email: 'ahmed.hassan@company.com',
      phone: '+1-512-555-2003',
      address: {
        billing: {
          street: '3456 Jollyville Rd',
          city: 'Austin',
          state: 'TX',
          zipCode: '78759',
          country: 'USA'
        }
      },
      type: 'business',
      businessInfo: {
        companyName: 'Hassan Consulting Group',
        taxId: '12-3456789',
        website: 'https://hassanconsulting.com'
      },
      totalPurchases: {
        count: 45,
        amount: 12500.50
      },
      lastPurchase: new Date('2024-01-14'),
      creditLimit: 15000,
      paymentTerms: 30,
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'TFS000005',
      firstName: 'Lisa',
      lastName: 'Wang',
      email: 'lisa.wang@startup.io',
      phone: '+1-512-555-2004',
      address: {
        billing: {
          street: '7890 Great Hills Trail',
          city: 'Austin',
          state: 'TX',
          zipCode: '78759',
          country: 'USA'
        }
      },
      type: 'business',
      businessInfo: {
        companyName: 'TechStart Innovations',
        taxId: '98-7654321',
        website: 'https://techstartinnovations.io'
      },
      totalPurchases: {
        count: 32,
        amount: 8750.25
      },
      lastPurchase: new Date('2024-01-13'),
      creditLimit: 12000,
      paymentTerms: 15,
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'TFS000006',
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      email: 'carlos.rodriguez@creative.com',
      phone: '+1-512-555-2005',
      address: {
        billing: {
          street: '2345 Creative Commons Blvd',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1989-06-30'),
      gender: 'male',
      totalPurchases: {
        count: 6,
        amount: 850.75
      },
      lastPurchase: new Date('2024-01-08'),
      isActive: true,
      isVerified: false,
      createdBy: users[0]._id
    },
    {
      customerCode: 'TFS000007',
      firstName: 'Jessica',
      lastName: 'Kim',
      email: 'jessica.kim@freelance.com',
      phone: '+1-512-555-2006',
      address: {
        billing: {
          street: '4567 Design District',
          city: 'Austin',
          state: 'TX',
          zipCode: '78703',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1993-03-12'),
      gender: 'female',
      totalPurchases: {
        count: 14,
        amount: 1650.00
      },
      lastPurchase: new Date('2024-01-11'),
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'TFS000008',
      firstName: 'Robert',
      lastName: 'Thompson',
      email: 'robert.thompson@enterprise.com',
      phone: '+1-512-555-2007',
      address: {
        billing: {
          street: '8901 Enterprise Way',
          city: 'Austin',
          state: 'TX',
          zipCode: '78744',
          country: 'USA'
        }
      },
      type: 'business',
      businessInfo: {
        companyName: 'Thompson Enterprise Solutions',
        taxId: '55-1234567',
        website: 'https://thompsonenterprise.com'
      },
      totalPurchases: {
        count: 78,
        amount: 18500.75
      },
      lastPurchase: new Date('2024-01-16'),
      creditLimit: 25000,
      paymentTerms: 45,
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'TFS000009',
      firstName: 'Aisha',
      lastName: 'Patel',
      email: 'aisha.patel@consulting.com',
      phone: '+1-512-555-2008',
      address: {
        billing: {
          street: '6789 Business Center Dr',
          city: 'Austin',
          state: 'TX',
          zipCode: '78727',
          country: 'USA'
        }
      },
      type: 'business',
      businessInfo: {
        companyName: 'Patel Digital Consulting',
        taxId: '77-9876543',
        website: 'https://pateldigital.com'
      },
      totalPurchases: {
        count: 25,
        amount: 5200.50
      },
      lastPurchase: new Date('2024-01-09'),
      creditLimit: 8000,
      paymentTerms: 20,
      isActive: true,
      isVerified: true,
      createdBy: users[0]._id
    },
    {
      customerCode: 'TFS000010',
      firstName: 'James',
      lastName: 'Wilson',
      email: 'james.wilson@personal.com',
      phone: '+1-512-555-2009',
      address: {
        billing: {
          street: '3456 Residential Park',
          city: 'Austin',
          state: 'TX',
          zipCode: '78748',
          country: 'USA'
        }
      },
      type: 'individual',
      dateOfBirth: new Date('1984-12-05'),
      gender: 'male',
      totalPurchases: {
        count: 4,
        amount: 425.25
      },
      lastPurchase: new Date('2024-01-06'),
      isActive: true,
      isVerified: false,
      createdBy: users[0]._id
    }
  ]);

  // Products
  const products = await Product.insertMany([
    // Mice & Pointing Devices
    {
      name: 'Logitech MX Master 3S Wireless Mouse',
      sku: 'TF-MOU-001',
      description: 'Premium wireless mouse with MagSpeed scroll wheel, 8000 DPI sensor, and 70-day battery life',
      category: catMice._id,
      pricing: {
        costPrice: 45.00,
        sellingPrice: 99.99,
        currency: 'USD',
        markup: 122.2,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 85,
        minStock: 15,
        maxStock: 200,
        unit: 'pcs',
        reorderLevel: 20,
        warehouse: warehouses[0]._id, // Main Warehouse
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
      name: 'Razer DeathAdder V3 Gaming Mouse',
      sku: 'TF-MOU-002',
      description: 'Pro gaming mouse with Focus Pro 30K sensor, 90-hour battery, and ergonomic design',
      category: catGamingPeripherals._id,
      pricing: {
        costPrice: 35.00,
        sellingPrice: 79.99,
        currency: 'USD',
        markup: 128.5,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 45,
        minStock: 10,
        maxStock: 150,
        unit: 'pcs',
        reorderLevel: 15,
        warehouse: warehouses[1]._id, // North Warehouse
        warehouseLocation: {
          zone: 'A',
          aisle: '01',
          shelf: '02',
          bin: '001'
        }
      },
      supplier: suppliers[2]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    // Keyboards
    {
      name: 'Keychron K8 Pro Mechanical Keyboard',
      sku: 'TF-KEY-001',
      description: 'Wireless mechanical keyboard with Gateron switches, RGB backlighting, and Mac/Windows compatibility',
      category: catKeyboards._id,
      pricing: {
        costPrice: 65.00,
        sellingPrice: 149.99,
        currency: 'USD',
        markup: 130.8,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 32,
        minStock: 8,
        maxStock: 100,
        unit: 'pcs',
        reorderLevel: 12,
        warehouse: warehouses[1]._id, // North Warehouse
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
      name: 'SteelSeries Apex Pro TKL Gaming Keyboard',
      sku: 'TF-KEY-002',
      description: 'Professional gaming keyboard with adjustable actuation switches and OLED display',
      category: catGamingPeripherals._id,
      pricing: {
        costPrice: 85.00,
        sellingPrice: 199.99,
        currency: 'USD',
        markup: 135.3,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 18,
        minStock: 5,
        maxStock: 75,
        unit: 'pcs',
        reorderLevel: 8,
        warehouse: warehouses[2]._id, // South Distribution Center
        warehouseLocation: {
          zone: 'A',
          aisle: '02',
          shelf: '02',
          bin: '001'
        }
      },
      supplier: suppliers[2]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    // Monitors
    {
      name: 'Dell UltraSharp 27" 4K Monitor',
      sku: 'TF-MON-001',
      description: '27-inch 4K UHD monitor with 99% sRGB color accuracy and USB-C connectivity',
      category: catMonitors._id,
      pricing: {
        costPrice: 280.00,
        sellingPrice: 499.99,
        currency: 'USD',
        markup: 78.6,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 22,
        minStock: 5,
        maxStock: 50,
        unit: 'pcs',
        reorderLevel: 8,
        warehouse: warehouses[2]._id, // South Distribution Center
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
    // Office Furniture
    {
      name: 'Herman Miller Aeron Chair',
      sku: 'TF-CHAIR-001',
      description: 'Ergonomic office chair with PostureFit SL support and breathable mesh design',
      category: catFurniture._id,
      pricing: {
        costPrice: 550.00,
        sellingPrice: 1195.00,
        currency: 'USD',
        markup: 117.3,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 8,
        minStock: 2,
        maxStock: 25,
        unit: 'pcs',
        reorderLevel: 4,
        warehouse: warehouses[3]._id, // Electronics Hub
        warehouseLocation: {
          zone: 'C',
          aisle: '01',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[4]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    // Headphones
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      sku: 'TF-HP-001',
      description: 'Premium noise-canceling headphones with 30-hour battery and crystal clear calls',
      category: catHeadphones._id,
      pricing: {
        costPrice: 180.00,
        sellingPrice: 399.99,
        currency: 'USD',
        markup: 122.2,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 35,
        minStock: 8,
        maxStock: 100,
        unit: 'pcs',
        reorderLevel: 12,
        warehouse: warehouses[0]._id, // Main Warehouse
        warehouseLocation: {
          zone: 'D',
          aisle: '01',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[3]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    {
      name: 'SteelSeries Arctis 7P Gaming Headset',
      sku: 'TF-HP-002',
      description: 'Wireless gaming headset with Discord-certified microphone and 30-hour battery life',
      category: catGamingPeripherals._id,
      pricing: {
        costPrice: 75.00,
        sellingPrice: 169.99,
        currency: 'USD',
        markup: 126.7,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 28,
        minStock: 6,
        maxStock: 80,
        unit: 'pcs',
        reorderLevel: 10,
        warehouse: warehouses[3]._id, // Electronics Hub
        warehouseLocation: {
          zone: 'D',
          aisle: '01',
          shelf: '02',
          bin: '001'
        }
      },
      supplier: suppliers[2]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    // Speakers
    {
      name: 'Audioengine A5+ Wireless Speakers',
      sku: 'TF-SPK-001',
      description: 'Premium powered speakers with wireless connectivity and analog inputs',
      category: catSpeakers._id,
      pricing: {
        costPrice: 200.00,
        sellingPrice: 469.99,
        currency: 'USD',
        markup: 135.0,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 12,
        minStock: 3,
        maxStock: 40,
        unit: 'pcs',
        reorderLevel: 6,
        warehouse: warehouses[0]._id, // Main Warehouse
        warehouseLocation: {
          zone: 'D',
          aisle: '02',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[3]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    // Gaming Console
    {
      name: 'PlayStation 5 Console',
      sku: 'TF-CON-001',
      description: 'Next-generation gaming console with 4K gaming and ultra-fast SSD storage',
      category: catGamingConsoles._id,
      pricing: {
        costPrice: 400.00,
        sellingPrice: 499.99,
        currency: 'USD',
        markup: 25.0,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 6,
        minStock: 2,
        maxStock: 20,
        unit: 'pcs',
        reorderLevel: 4,
        warehouse: warehouses[1]._id, // North Warehouse
        warehouseLocation: {
          zone: 'E',
          aisle: '01',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[2]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    // Laptop
    {
      name: 'MacBook Pro 14" M3 Chip',
      sku: 'TF-LAP-001',
      description: '14-inch MacBook Pro with M3 chip, 16GB RAM, and 512GB SSD',
      category: catComputers._id,
      pricing: {
        costPrice: 1200.00,
        sellingPrice: 1999.99,
        currency: 'USD',
        markup: 66.7,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 4,
        minStock: 1,
        maxStock: 15,
        unit: 'pcs',
        reorderLevel: 3,
        warehouse: warehouses[3]._id, // Electronics Hub
        warehouseLocation: {
          zone: 'F',
          aisle: '01',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[1]._id,
      isActive: true,
      createdBy: users[0]._id
    },
    // Office Supplies
    {
      name: 'Moleskine Classic Notebook Set',
      sku: 'TF-OFF-001',
      description: 'Set of 3 classic hardcover notebooks with ruled pages and elastic closure',
      category: catSupplies._id,
      pricing: {
        costPrice: 12.00,
        sellingPrice: 29.99,
        currency: 'USD',
        markup: 149.9,
        taxRate: 8.25,
      },
      inventory: {
        currentStock: 75,
        minStock: 20,
        maxStock: 200,
        unit: 'sets',
        reorderLevel: 30,
        warehouse: warehouses[2]._id, // South Distribution Center
        warehouseLocation: {
          zone: 'G',
          aisle: '01',
          shelf: '01',
          bin: '001'
        }
      },
      supplier: suppliers[4]._id,
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
      message: 'I need information about wireless mice for my office setup. Looking for ergonomic options with good battery life.',
      priority: 'normal',
      status: 'new',
      productsOfInterest: [
        { product: products[0]._id, name: products[0].name, quantity: 5 }
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
      message: 'We need to equip our new office with chairs, keyboards, and mice. Looking for volume discounts.',
      priority: 'high',
      status: 'under_review',
      productsOfInterest: [
        { product: products[4]._id, name: products[4].name, quantity: 20 },
        { product: products[2]._id, name: products[2].name, quantity: 20 },
        { product: products[0]._id, name: products[0].name, quantity: 20 }
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
      message: 'My car battery died and I need a replacement. What options do you have available?',
      priority: 'urgent',
      status: 'converted_to_order',
      productsOfInterest: [
        { product: products[8]._id, name: products[8].name, quantity: 1 }
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
      message: 'I want to build a gaming setup and need advice on monitors, keyboards, and mice.',
      priority: 'normal',
      status: 'closed',
      productsOfInterest: [
        { product: products[8]._id, name: products[8].name, quantity: 1 },
        { product: products[0]._id, name: products[0].name, quantity: 1 }
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
      message: 'My office chair broke after 6 months. What is the warranty process?',
      priority: 'high',
      status: 'closed',
      productsOfInterest: [
        { product: products[4]._id, name: products[4].name, quantity: 1 }
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
  console.log(`👥 Seeded ${users.length} users (6 staff + 5 customers)`);
  console.log(`📦 Seeded ${[catElectronics, catOffice, catGaming, catNetworking, catAudio, catComputers, catPeripherals, catMobile, catFurniture, catSupplies, catMice, catKeyboards, catMonitors, catGamingPeripherals, catGamingConsoles, catHeadphones, catSpeakers].length} categories`);
  console.log(`🏢 Seeded ${suppliers.length} suppliers`);
  console.log(`🏭 Seeded ${warehouses.length} warehouses`);
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
  users.slice(0, 6).forEach((user, index) => {
    const roleNames = ['CTO (Admin)', 'Sales Manager', 'Customer Success Specialist', 'Operations Manager', 'Financial Analyst', 'Technical Support Specialist'];
    console.log(`${roleNames[index]}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: password123`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Phone: ${user.phone || 'N/A'}`);
    console.log(`  Department: ${user.department}`);
    console.log('');
  });

  // Customer users
  console.log('👤 CUSTOMER ACCOUNTS:');
  console.log('─'.repeat(30));
  users.slice(6).forEach((user, index) => {
    const customerNames = ['Sophia Martinez', 'Michael Johnson', 'Emily Davis', 'Ahmed Hassan', 'Lisa Wang'];
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
  console.log('CTO (Admin): Full access to all features and system administration');
  console.log('Sales Manager: Can create employees and customers, manage sales processes');
  console.log('Customer Success Specialist: Handle customer support and inquiries');
  console.log('Operations Manager: Manage inventory, warehouse, and delivery operations');
  console.log('Warehouse Manager: Full access to warehouse operations, inventory, and staff management');
  console.log('Financial Analyst: Access to financial reports, transactions, and accounting');
  console.log('Technical Support Specialist: Handle technical issues and system support');
  console.log('Customer: Access to customer dashboard, purchases, wallet, support');
  console.log('');
  console.log('🔗 PHONE-BASED LINKING:');
  console.log('─'.repeat(30));
  console.log('• Customer phone numbers match between user accounts and customer records');
  console.log('• POS and Workshop jobs can be created with phone numbers only');
  console.log('• Automatic linking when customers register with existing phone numbers');
  console.log('');
  console.log('🏭 WAREHOUSE LOCATIONS:');
  console.log('─'.repeat(30));
  warehouses.forEach((warehouse, index) => {
    console.log(`${warehouse.name} (${warehouse.code}):`);
    console.log(`  Location: ${warehouse.address.city}, ${warehouse.address.state}`);
    console.log(`  Capacity: ${warehouse.capacity.currentOccupancy}/${warehouse.capacity.totalCapacity} sq ft (${Math.round((warehouse.capacity.currentOccupancy/warehouse.capacity.totalCapacity)*100)}% used)`);
    console.log(`  Manager: ${warehouse.contact.manager.name}`);
    console.log(`  Contact: ${warehouse.contact.phone}`);
    console.log('');
  });
  console.log('📈 TECHFLOW SOLUTIONS BUSINESS FLOW:');
  console.log('─'.repeat(30));
  console.log('• Modern Tech Products: Premium electronics, gaming gear, and office equipment');
  console.log('• Customer Inquiries: Track tech requests and provide expert consultation');
  console.log('• Quotations: Generate quotes with inventory checking and approval workflow');
  console.log('• Orders: Convert approved quotations to confirmed orders');
  console.log('• Warehouse Management: Multi-location inventory tracking and operations');
  console.log('• Deliveries: Track order fulfillment and delivery status');
  console.log('• Stock Alerts: Monitor inventory levels and generate replenishment suggestions');
  console.log('• Operations Dashboard: Monitor sales, inventory, and customer satisfaction');
  console.log('═'.repeat(50));

  await mongoose.connection.close();
  console.log('✅ Seed complete. Connection closed.');
}

seed().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});


