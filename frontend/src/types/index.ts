// User Types
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'employee' | 'customer';
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  permissions?: Permission[];
  wallet?: Wallet;
  preferences?: UserPreferences;
  salary?: Salary;
  hireDate?: string;
  department?: string;
  position?: string;
  address?: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  module: string;
  actions: string[];
}

export interface Wallet {
  balance: number;
  currency: string;
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
  wallet: Wallet;
  preferences?: CustomerPreferences;
  totalPurchases: number;
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

// Invoice Types
export interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer: string | Customer;
  customerPhone: string;
  items: InvoiceItem[];
  subTotal: number;
  discount: Discount;
  tax: Tax;
  totalAmount: number;
  paid: number;
  dueAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  invoiceDate: string;
  dueDate?: string;
  paymentMethod?: string;
  payments: Payment[];
  notes?: string;
  type: 'invoice' | 'quote' | 'receipt';
  onlinePaymentLink?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  product: string | Product;
  quantity: number;
  unitPrice: number;
  discount?: Discount;
  tax?: Tax;
  total: number;
}

export interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
}

export interface Tax {
  type: string;
  rate: number;
  amount: number;
}

export interface Payment {
  amount: number;
  method: string;
  reference?: string;
  date: string;
  processedBy: string;
}

// Stock Movement Types
export interface StockMovement {
  _id: string;
  product: string | Product;
  quantity: number;
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  reason: string;
  referenceDocument?: string;
  movedBy: string;
  movementDate: string;
  createdAt: string;
}

// Project and Task types removed

// Support Types
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
  projects: {
    active: number;
    completedThisMonth: number;
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
