import axios from 'axios';
import { formatValidationErrors } from './utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Guard to prevent multiple simultaneous redirects on 401
let isHandlingUnauthorized = false;

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true;
        // Token expired or invalid -> clear and redirect to login with reason
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch {}
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isOnLogin = currentPath?.startsWith('/auth/login');
        const redirectUrl = '/auth/login?reason=session_expired';
        if (!isOnLogin) {
          window.location.href = redirectUrl;
        }
      }
    }
    
    // Enhance error with formatted validation messages
    if (error.response?.data) {
      error.formattedMessage = formatValidationErrors(error);
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: any) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
};

// Users API
export const usersAPI = {
  getUsers: (params?: any) => api.get('/users', { params }),
  getUserById: (id: string) => api.get(`/users/${id}`),
  createUser: (userData: any) => api.post('/users', userData),
  updateUser: (id: string, userData: any) => api.put(`/users/${id}`, userData),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getUserProfile: () => api.get('/users/profile'),
  updateUserProfile: (userData: any) => api.put('/users/profile', userData),
  getUserStats: (id: string) => api.get(`/users/${id}/stats`),
};


// Products API
export const productsAPI = {
  getProducts: (params?: any) => api.get('/products', { params }),
  getProductById: (id: string) => api.get(`/products/${id}`),
  createProduct: (productData: any) => api.post('/products', productData),
  updateProduct: (id: string, productData: any) => api.put(`/products/${id}`, productData),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
  updateProductStock: (id: string, stockData: any) =>
    api.put(`/products/${id}/stock`, stockData),
  getLowStockProducts: () => api.get('/products/low-stock'),
  getProductStats: () => api.get('/products/stats'),
};

// Categories API
export const categoriesAPI = {
  getCategories: (params?: any) => api.get('/categories', { params }),
  createCategory: (data: any) => api.post('/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
};

// Customers API
export const customersAPI = {
  getCustomers: (params?: any) => api.get('/customers', { params }),
  getCustomerById: (id: string) => api.get(`/customers/${id}`),
  createCustomer: (customerData: any) => api.post('/customers', customerData),
  updateCustomer: (id: string, customerData: any) =>
    api.put(`/customers/${id}`, customerData),
  deleteCustomer: (id: string) => api.delete(`/customers/${id}`),
  getTopCustomers: () => api.get('/customers/top'),
  getCustomerStats: (id: string) => api.get(`/customers/${id}/stats`),
  addWalletTransaction: (id: string, transactionData: any) =>
    api.post(`/customers/${id}/wallet`, transactionData),
  getWalletTransactions: (id: string, params?: any) =>
    api.get(`/customers/${id}/wallet/transactions`, { params }),
};

// Suppliers API
export const suppliersAPI = {
  getSuppliers: (params?: any) => api.get('/suppliers', { params }),
  getSupplierById: (id: string) => api.get(`/suppliers/${id}`),
  createSupplier: (supplierData: any) => api.post('/suppliers', supplierData),
  updateSupplier: (id: string, supplierData: any) =>
    api.put(`/suppliers/${id}`, supplierData),
  deleteSupplier: (id: string) => api.delete(`/suppliers/${id}`),
  getTopSuppliers: () => api.get('/suppliers/top'),
  getSupplierStats: (id: string) => api.get(`/suppliers/${id}/stats`),
  updateSupplierRating: (id: string, rating: number) =>
    api.put(`/suppliers/${id}/rating`, { rating }),
};

// Invoices API
export const invoicesAPI = {
  getInvoices: (params?: any) => api.get('/invoices', { params }),
  getInvoiceById: (id: string) => api.get(`/invoices/${id}`),
  createInvoice: (invoiceData: any) => api.post('/invoices', invoiceData),
  updateInvoice: (id: string, invoiceData: any) =>
    api.put(`/invoices/${id}`, invoiceData),
  deleteInvoice: (id: string) => api.delete(`/invoices/${id}`),
  addPayment: (id: string, paymentData: any) =>
    api.post(`/invoices/${id}/payments`, paymentData),
  generateQR: (id: string) => api.get(`/invoices/${id}/qr`),
  getInvoiceStats: () => api.get('/invoices/stats'),
};

// Inventory API
export const inventoryAPI = {
  getStockMovements: (params?: any) => api.get('/inventory/movements', { params }),
  createStockMovement: (movementData: any) =>
    api.post('/inventory/movements', movementData),
  getInventoryLevels: () => api.get('/inventory/levels'),
  getInventoryStats: () => api.get('/inventory/stats'),
  getProductMovements: (productId: string, params?: any) =>
    api.get(`/inventory/products/${productId}/movements`, { params }),
  getProductStock: (productId: string) =>
    api.get(`/inventory/products/${productId}/stock`),
  performStockAdjustment: (adjustmentData: any) =>
    api.post('/inventory/adjustment', adjustmentData),
};

// POS API
export const posAPI = {
  getDashboard: () => api.get('/pos/dashboard'),
  getTransactions: (params?: any) => api.get('/pos/transactions', { params }),
  getRegisterStatus: (registerId: string) =>
    api.get(`/pos/registers/${registerId}/status`),
  getRegisterSessions: (registerId: string, params?: any) =>
    api.get(`/pos/registers/${registerId}/sessions`, { params }),
  openRegister: (registerId: string, data: any) =>
    api.post(`/pos/registers/${registerId}/open`, data),
  closeRegister: (registerId: string, data: any) =>
    api.post(`/pos/registers/${registerId}/close`, data),
  createTransaction: (data: any) => api.post('/pos/transactions', data),
};

// Projects API
export const projectsAPI = undefined as unknown as never;

// Tasks API
export const tasksAPI = undefined as unknown as never;

// Support API
export const supportAPI = {
  getSupportTickets: (params?: any) => api.get('/support', { params }),
  getSupportTicketById: (id: string) => api.get(`/support/${id}`),
  createSupportTicket: (ticketData: any) => api.post('/support', ticketData),
  updateSupportTicket: (id: string, ticketData: any) =>
    api.put(`/support/${id}`, ticketData),
  deleteSupportTicket: (id: string) => api.delete(`/support/${id}`),
  addConversation: (id: string, conversation: any) =>
    api.post(`/support/${id}/conversations`, conversation),
  assignTicket: (id: string, assignedTo: string) =>
    api.put(`/support/${id}/assign`, { assignedTo }),
  updateTicketStatus: (id: string, status: string) =>
    api.put(`/support/${id}/status`, { status }),
  addSatisfactionRating: (id: string, rating: any) =>
    api.post(`/support/${id}/satisfaction`, rating),
  getSupportStats: () => api.get('/support/stats'),
  getOverdueTickets: () => api.get('/support/overdue'),
};

// Accounts API
export const accountsAPI = {
  getAccounts: (params?: any) => api.get('/accounts', { params }),
  getAccountById: (id: string) => api.get(`/accounts/${id}`),
  createAccount: (accountData: any) => api.post('/accounts', accountData),
  updateAccount: (id: string, accountData: any) =>
    api.put(`/accounts/${id}`, accountData),
  deleteAccount: (id: string) => api.delete(`/accounts/${id}`),
  getChartOfAccounts: () => api.get('/accounts/chart'),
  getAccountsByType: (type: string, params?: any) =>
    api.get(`/accounts/type/${type}`, { params }),
  getAccountBalance: (id: string, params?: any) =>
    api.get(`/accounts/${id}/balance`, { params }),
  getAccountTransactions: (id: string, params?: any) =>
    api.get(`/accounts/${id}/transactions`, { params }),
  getAccountStats: () => api.get('/accounts/stats'),
};

// Transactions API
export const transactionsAPI = {
  getTransactions: (params?: any) => api.get('/transactions', { params }),
  getTransactionById: (id: string) => api.get(`/transactions/${id}`),
  createTransaction: (transactionData: any) =>
    api.post('/transactions', transactionData),
  updateTransaction: (id: string, transactionData: any) =>
    api.put(`/transactions/${id}`, transactionData),
  deleteTransaction: (id: string) => api.delete(`/transactions/${id}`),
  approveTransaction: (id: string) => api.put(`/transactions/${id}/approve`),
  postTransaction: (id: string) => api.put(`/transactions/${id}/post`),
  reconcileTransaction: (id: string) => api.put(`/transactions/${id}/reconcile`),
  getTransactionStats: (params?: any) => api.get('/transactions/stats', { params }),
};

// Reports API
export const reportsAPI = {
  getDashboardStats: () => api.get('/reports/dashboard'),
  getSalesReport: (params?: any) => api.get('/reports/sales', { params }),
  getPurchaseReport: (params?: any) => api.get('/reports/purchases', { params }),
  getProfitLossReport: (params?: any) => api.get('/reports/profit-loss', { params }),
  getBalanceSheetReport: (params?: any) =>
    api.get('/reports/balance-sheet', { params }),
  getInventoryReport: (params?: any) => api.get('/reports/inventory', { params }),
  
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data: any) => api.put('/settings', data),
  uploadLogo: (formData: FormData) => api.post('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteLogo: () => api.delete('/settings/logo'),
};

// HRM API
export const hrmAPI = undefined as unknown as never;

// Workshop API
export const workshopAPI = {
  getJobs: (params?: any) => api.get('/workshop', { params }),
  getJobById: (id: string) => api.get(`/workshop/${id}`),
  createJob: (data: any) => api.post('/workshop', data),
  updateJob: (id: string, data: any) => api.put(`/workshop/${id}`, data),
  scheduleJob: (id: string, data: { start?: string; end?: string }) =>
    api.put(`/workshop/${id}/schedule`, data),
  updateProgress: (id: string, data: { progress?: number; status?: string }) =>
    api.put(`/workshop/${id}/progress`, data),
  completeJob: (id: string) => api.post(`/workshop/${id}/complete`),
  cancelJob: (id: string) => api.put(`/workshop/${id}/cancel`),
};

export default api;
