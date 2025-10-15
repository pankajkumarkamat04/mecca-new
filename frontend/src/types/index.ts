// User Types
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'customer' | 'warehouse_manager' | 'warehouse_employee' | 'sales_person' | 'workshop_employee';
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  permissions?: Permission[];
  preferences?: UserPreferences;
  salary?: Salary;
  hireDate?: string;
  department?: string;
  position?: string;
  address?: Address;
  warehouse?: {
    assignedWarehouse: string;
    warehousePosition: string;
    assignedAt: string;
    assignedBy: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  module: string;
  actions: string[];
}


export interface UserPreferences {
  language: string;
  timezone: string;
}

export interface Salary {
  amount: number;
  currency: string;
  paymentType: 'monthly' | 'weekly' | 'daily' | 'hourly';
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}


// Product Types
export interface Product {
  _id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: string;
  pricing: ProductPricing;
  inventory: ProductInventory;
  variations?: ProductVariation[];
  images?: ProductImage[];
  specifications?: ProductSpecification[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPricing {
  costPrice: number;
  sellingPrice: number;
  markup: number;
  currency: string;
}

export interface ProductInventory {
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  unit: string;
  location?: string;
  warehouse?: string;
  warehouseLocation?: {
    zone: string;
    aisle: string;
    shelf: string;
    bin: string;
  };
}

export interface ProductVariation {
  name: string;
  value: string;
  priceAdjustment?: number;
  stockAdjustment?: number;
}

export interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface ProductSpecification {
  name: string;
  value: string;
  unit?: string;
}

// Customer Types
export interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  customerCode: string;
  type: 'individual' | 'business';
  address?: Address;
  preferences?: CustomerPreferences;
  totalPurchases: {
    amount: number;
    count: number;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}


export interface CustomerPreferences {
  language: string;
  currency: string;
}

// Supplier Types
export interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  address?: Address;
  supplierCode: string;
  paymentTerms: string;
  creditLimit: number;
  totalPurchases: number;
  lastPurchaseDate?: string;
  rating: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Workshop Job Types
export interface WorkshopJob {
  _id: string;
  jobNumber: string;
  customer: string | Customer;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    vin?: string;
    licensePlate?: string;
    mileage?: number;
  };
  jobType: 'repair' | 'maintenance' | 'inspection' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'waiting_parts' | 'waiting_customer' | 'completed' | 'cancelled';
  estimatedDuration: number; // in minutes
  actualDuration?: number; // in minutes
  estimatedCost: number;
  actualCost?: number;
  startDate?: string;
  completionDate?: string;
  dueDate?: string;
  tasks: JobTask[];
  parts: JobPart[];
  tools: JobTool[];
  notes?: string;
  internalNotes?: string;
  assignedTo?: string | User;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobTask {
  _id: string;
  title: string;
  description?: string;
  assignee?: string | User;
  assigneeName?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration?: number;
  actualDuration?: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  attachments: TaskAttachment[];
  dependencies: string[];
  createdBy: string;
  lastUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobPart {
  _id: string;
  product: string | Product;
  productName: string;
  productSku: string;
  quantityRequired: number;
  quantityUsed: number;
  quantityAvailable: number;
  unitCost?: number;
  totalCost?: number;
  isAvailable: boolean;
  notes?: string;
  reservedAt?: string;
  reservedBy?: string | User;
  issuedAt?: string;
  issuedBy?: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface JobTool {
  _id: string;
  name: string;
  toolId?: string | Tool;
  category: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  requiredFrom?: string;
  requiredUntil?: string;
  assignedTo?: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  filename: string;
  url: string;
  fileType?: string;
  size?: number;
  uploadedAt: string;
}

// Technician Types
export interface Technician {
  _id: string;
  user: string | User;
  employeeId: string;
  department: string;
  position: string;
  hireDate: string;
  certifications: Certification[];
  skills: Skill[];
  availability: Availability[];
  currentJobs: string[];
  completedJobs: number;
  averageRating: number;
  totalRating: number;
  isActive: boolean;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Certification {
  name: string;
  issuingBody: string;
  certificateNumber?: string;
  issuedDate: string;
  expiryDate: string;
  isActive: boolean;
  notes?: string;
}

export interface Skill {
  name: string;
  category: 'mechanical' | 'electrical' | 'diagnostic' | 'welding' | 'painting' | 'assembly' | 'other';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience: number;
  lastUsed?: string;
  isActive: boolean;
}

export interface Availability {
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// Machine Types
export interface Machine {
  _id: string;
  name: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  category: 'diagnostic' | 'repair' | 'lifting' | 'welding' | 'machining' | 'testing' | 'other';
  status: 'operational' | 'maintenance' | 'broken' | 'retired';
  location: {
    building?: string;
    floor?: string;
    room?: string;
    bay?: string;
  };
  specifications: {
    powerRating?: string;
    dimensions?: string;
    weight?: number;
    capacity?: string;
    operatingPressure?: string;
    operatingTemperature?: string;
  };
  purchaseInfo: {
    purchaseDate?: string;
    purchasePrice?: number;
    supplier?: string;
    warrantyExpiry?: string;
  };
  maintenance: {
    schedule?: string;
    lastMaintenance?: string;
    nextMaintenance?: string;
    maintenanceHistory: MaintenanceRecord[];
  };
  assignedTo?: string | User;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord {
  type: 'preventive' | 'corrective' | 'emergency';
  description: string;
  performedBy?: string | User;
  performedAt: string;
  nextMaintenanceDate?: string;
  cost?: number;
  notes?: string;
}

// Customer Inquiry Types
export interface CustomerInquiry {
  _id: string;
  inquiryNumber: string;
  customer: string | Customer;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCompany?: string;
  inquiryDate: string;
  subject?: string;
  description?: string;
  items: InquiryItem[];
  totalEstimatedValue: number;
  status: 'new' | 'quoted' | 'converted' | 'cancelled' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'website' | 'phone' | 'email' | 'walk_in' | 'referral' | 'other';
  assignedTo?: string | User;
  notes?: string;
  internalNotes?: string;
  followUpDate?: string;
  quotationGenerated?: boolean;
  quotationId?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryItem {
  product?: string | Product;
  name: string;
  description?: string;
  quantity: number;
  estimatedPrice?: number;
  specifications?: string;
  notes?: string;
}

// Support Ticket Types (updated to match backend)
export interface SupportTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  customer: string | Customer;
  assignedTo?: string | User;
  createdBy: string | User;
  category: 'technical' | 'billing' | 'general' | 'bug_report' | 'feature_request' | 'complaint';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'waiting_support' | 'resolved' | 'closed';
  type: 'customer' | 'employee';
  attachments: SupportAttachment[];
  conversations: Conversation[];
  tags: string[];
  sla: SLA;
  satisfaction?: Satisfaction;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tool Types
export interface Tool {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  location: {
    building?: string;
    floor?: string;
    room?: string;
    bay?: string;
  };
  specifications: {
    powerRating?: string;
    dimensions?: string;
    weight?: number;
    capacity?: string;
  };
  purchaseInfo: {
    purchaseDate?: string;
    purchasePrice?: number;
    supplier?: string;
    warrantyExpiry?: string;
  };
  assignedTo?: string | User;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Sales Outlet Types
export interface SalesOutlet {
  _id: string;
  outletCode: string;
  name: string;
  type: 'retail' | 'warehouse' | 'online' | 'mobile' | 'kiosk' | 'branch';
  address: Address;
  contact: {
    phone: string;
    email: string;
    manager: string;
  };
  operatingHours: {
    [key: string]: {
      open: string;
      close: string;
      isClosed: boolean;
    };
  };
  warehouse?: string;
  stats: {
    totalSales: number;
    totalTransactions: number;
    lastSaleDate?: string;
    averageTransactionValue: number;
  };
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Receipt Types
export interface Receipt {
  receiptNumber: string;
  transactionId: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  date: string;
  time: string;
  status?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  totalTax?: number;
  totalDiscount?: number;
  total: number;
  paid?: number;
  paymentMethod: string;
  tenderedAmount: number;
  change: number;
  cashier: string;
  payments?: Payment[];
  currency?: {
    baseCurrency: string;
    displayCurrency: string;
    exchangeRate: number;
    exchangeRateDate: string;
  };
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sku?: string;
  // Optional fields that may be present in POS receipts
  discount?: number;
  taxRate?: number;
  price?: number;
}

// Payment Types
export interface OrderPayment {
  method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'online' | 'other';
  amount: number;
  reference?: string;
  notes?: string;
}

// Order Types
export interface Order {
  _id: string;
  orderNumber: string;
  customer: string | Customer;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: Address;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  items: OrderItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  shippingCost: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'online' | 'other';
  paymentDetails?: {
    transactionId?: string;
    reference?: string;
    notes?: string;
  };
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned'; // Legacy property for backward compatibility
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled' | 'shipped' | 'delivered';
  shippingAddress?: Address;
  billingAddress?: Address;
  shippingMethod: 'pickup' | 'delivery' | 'shipping' | 'express';
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  internalNotes?: string;
  assignedTo?: string | User;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  product: string | Product;
  name: string;
  sku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
  notes?: string;
}

// Quotation Types
export interface Quotation {
  _id: string;
  quotationNumber: string;
  customer: string | Customer;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: QuotationItem[];
  subtotal: number;
  discounts: Discount[];
  totalDiscount: number;
  taxes: Tax[];
  totalTax: number;
  shippingCost: number;
  total: number;
  totalAmount?: number; // Legacy property for backward compatibility
  quotationDate: string;
  validUntil: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'approved';
  inventoryCheck?: any; // For inventory checking functionality
  pickingList?: any; // For picking list functionality
  notes?: string;
  terms?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  product: string | Product;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

// Invoice Types
export interface Invoice {
  _id: string;
  invoiceNumber: string;
  type: 'sale' | 'proforma' | 'credit_note' | 'debit_note' | 'delivery_note';
  status: 'draft' | 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
  customer?: string | Customer;
  customerPhone: string;
  location: string;
  items: InvoiceItem[];
  subtotal: number;
  discounts: Discount[];
  totalDiscount: number;
  taxes: Tax[];
  totalTax: number;
  shipping: {
    method?: string;
    cost: number;
    address?: Address;
  };
  shippingCost?: number; // Legacy property for backward compatibility
  total: number;
  paid: number;
  balance: number;
  payments: Payment[];
  currency?: {
    baseCurrency: string;
    displayCurrency: string;
    exchangeRate: number;
    exchangeRateDate: string;
  };
  invoiceDate: string;
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
  internalNotes?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  product: string | Product;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  price?: number; // Legacy property for backward compatibility
  discount: number;
  taxRate: number;
  total: number;
}

export interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
  description?: string;
}

export interface Tax {
  name?: string;
  rate: number;
  amount: number;
}

export interface Payment {
  method: 'cash' | 'card' | 'bank_transfer' | 'stripe' | 'paypal' | 'other';
  amount: number;
  reference?: string;
  date: string;
  processedBy: string;
  notes?: string;
  metadata?: {
    tenderedAmount?: number;
    changeAmount?: number;
    tenderedCurrency?: string;
    [key: string]: any;
  };
}

// Stock Movement Types
export interface StockMovement {
  _id: string;
  product: string | Product;
  quantity: number;
  movementType: 'in' | 'out' | 'transfer' | 'adjustment' | 'return' | 'damage' | 'expired' | 'receiving' | 'picking' | 'packing' | 'shipping' | 'cycle_count' | 'stock_take';
  reason?: string;
  referenceDocument?: string;
  movedBy?: string | { firstName: string; lastName: string };
  createdBy?: string | { firstName: string; lastName: string };
  movementDate?: string;
  createdAt: string;
  updatedAt?: string;
  unitCost?: number;
  totalCost?: number;
  previousStock?: number;
  newStock?: number;
  reference?: string;
  referenceType?: string;
  notes?: string;
  warehouse?: string;
  warehouseName?: string;
  fromLocation?: any;
  toLocation?: any;
  supplier?: string | { name: string };
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
  description?: string;
  statusColor?: string;
  id?: string;
}

// Project and Task types removed

// Support Types

export interface SupportAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string | User;
  uploadedAt: string;
}

export interface Conversation {
  user: string | User;
  message: string;
  isInternal: boolean;
  attachments: SupportAttachment[];
  createdAt: string;
}

export interface SLA {
  responseTime: number; // in hours
  resolutionTime: number; // in hours
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
}

export interface Satisfaction {
  rating: number; // 1-5
  feedback?: string;
  ratedAt: string;
}

// Account Types
export interface Account {
  _id: string;
  name: string;
  code: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  parentAccount?: string | Account;
  description?: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  isSystemAccount: boolean;
  settings: AccountSettings;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSettings {
  allowNegativeBalance: boolean;
  requireApproval: boolean;
  autoReconcile: boolean;
}

// Transaction Types
export interface Transaction {
  _id: string;
  transactionNumber: string;
  date: string;
  description: string;
  type: 'sale' | 'purchase' | 'payment' | 'receipt' | 'expense' | 'income' | 'transfer' | 'adjustment' | 'journal';
  reference?: string;
  referenceId?: string;
  amount: number;
  currency: string;
  entries: TransactionEntry[];
  customer?: string | Customer;
  supplier?: string | Supplier;
  invoice?: string | Invoice;
  paymentMethod?: string;
  bankAccount?: BankAccount;
  attachments: TransactionAttachment[];
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'posted';
  isReconciled: boolean;
  reconciledAt?: string;
  reconciledBy?: string | User;
  notes?: string;
  createdBy: string | User;
  approvedBy?: string | User;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionEntry {
  account: string | Account;
  debit: number;
  credit: number;
  description?: string;
}

export interface BankAccount {
  accountNumber: string;
  bankName: string;
  routingNumber: string;
}

export interface TransactionAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// HRM Types
export interface Employee {
  _id: string;
  employeeId: string;
  user: string | User;
  department: string;
  position: string;
  hireDate: string;
  salary: Salary;
  benefits: Benefit[];
  documents: EmployeeDocument[];
  performanceReviews: PerformanceReview[];
  leaveBalance: LeaveBalance;
  reportsTo?: string | Employee;
  status: 'active' | 'inactive' | 'terminated';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Benefit {
  type: string;
  amount: number;
  description?: string;
}

export interface EmployeeDocument {
  name: string;
  url: string;
  type: string;
  uploadDate: string;
}

export interface PerformanceReview {
  period: string;
  rating: number;
  comments: string;
  reviewer: string | User;
  reviewDate: string;
}

export interface LeaveBalance {
  annual: number;
  sick: number;
  personal: number;
}

// Attendance Types
export interface Attendance {
  _id: string;
  employee: string | Employee;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  breaks: Break[];
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'half_day';
  location?: Location;
  approvedBy?: string | User;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Break {
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  reason?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

// Payroll Types
export interface Payroll {
  _id: string;
  employee: string | Employee;
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number;
  allowances: PayrollItem[];
  deductions: PayrollItem[];
  grossPay: number;
  netPay: number;
  paymentDate?: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paymentMethod?: string;
  notes?: string;
  processedBy?: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollItem {
  type: string;
  description: string;
  amount: number;
  isTaxable: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  role?: string;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Dashboard Types
export interface DashboardStats {
  sales: {
    monthlyTotal: number;
    monthlyInvoices: number;
  };
  customers: {
    total: number;
    newThisMonth: number;
  };
  products: {
    total: number;
    lowStock: number;
  };
  support: {
    openTickets: number;
    overdueTickets: number;
  };
  employees: {
    total: number;
    presentToday: number;
  };
}

// Chart Types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

// Filter Types
export interface FilterOptions {
  search?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Table Types
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  pagination?: Pagination;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: any) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: any[]) => void;
}

// Modal Types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

// Toast Types
export interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
