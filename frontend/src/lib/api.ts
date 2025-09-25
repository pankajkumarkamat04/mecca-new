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

// Quotations API
export const quotationsAPI = {
  getQuotations: (params?: any) => api.get('/quotations', { params }),
  getQuotationById: (id: string) => api.get(`/quotations/${id}`),
  createQuotation: (quotationData: any) => api.post('/quotations', quotationData),
  updateQuotation: (id: string, quotationData: any) => api.put(`/quotations/${id}`, quotationData),
  deleteQuotation: (id: string) => api.delete(`/quotations/${id}`),
  sendQuotation: (id: string) => api.post(`/quotations/${id}/send`),
  markAsViewed: (id: string) => api.post(`/quotations/${id}/view`),
  acceptQuotation: (id: string) => api.post(`/quotations/${id}/accept`),
  rejectQuotation: (id: string) => api.post(`/quotations/${id}/reject`),
  convertToOrder: (id: string) => api.post(`/quotations/${id}/convert-to-order`),
  convertToInvoice: (id: string) => api.post(`/quotations/${id}/convert`),
  getQuotationStats: () => api.get('/quotations/stats'),
};

// Orders API
export const ordersAPI = {
  getOrders: (params?: any) => api.get('/orders', { params }),
  getOrderById: (id: string) => api.get(`/orders/${id}`),
  createOrder: (orderData: any) => api.post('/orders', orderData),
  updateOrder: (id: string, orderData: any) => api.put(`/orders/${id}`, orderData),
  deleteOrder: (id: string) => api.delete(`/orders/${id}`),
  updateOrderStatus: (id: string, status: string, notes?: string) => 
    api.put(`/orders/${id}/status`, { status, notes }),
  updatePaymentStatus: (id: string, paymentData: any) => 
    api.put(`/orders/${id}/payment`, paymentData),
  assignOrder: (id: string, assignedTo: string) => 
    api.put(`/orders/${id}/assign`, { assignedTo }),
  convertToInvoice: (id: string) => api.post(`/orders/${id}/convert-to-invoice`),
  getOrderStats: () => api.get('/orders/stats'),
  getOrdersByCustomer: (customerId: string, params?: any) => 
    api.get(`/orders/customer/${customerId}`, { params }),
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  getPublicSettings: () => api.get('/settings/public'),
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

// Warehouse API
export const warehouseAPI = {
  getWarehouses: (params?: any) => api.get('/warehouses', { params }),
  getWarehouseById: (id: string) => api.get(`/warehouses/${id}`),
  createWarehouse: (data: any) => api.post('/warehouses', data),
  updateWarehouse: (id: string, data: any) => api.put(`/warehouses/${id}`, data),
  deleteWarehouse: (id: string) => api.delete(`/warehouses/${id}`),
  getWarehouseStats: () => api.get('/warehouses/stats'),
  getWarehouseInventory: (id: string) => api.get(`/warehouses/${id}/inventory`),
  addLocation: (id: string, data: any) => api.post(`/warehouses/${id}/locations`, data),
  updateLocation: (id: string, locationId: string, data: any) => 
    api.put(`/warehouses/${id}/locations/${locationId}`, data),
  removeLocation: (id: string, locationId: string) => 
    api.delete(`/warehouses/${id}/locations/${locationId}`),
  transferProducts: (data: any) => api.post('/warehouses/transfer', data),
};

// Purchase Order API
export const purchaseOrderAPI = {
  getPurchaseOrders: (params?: any) => api.get('/purchase-orders', { params }),
  getPurchaseOrderById: (id: string) => api.get(`/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => api.post('/purchase-orders', data),
  updatePurchaseOrder: (id: string, data: any) => api.put(`/purchase-orders/${id}`, data),
  deletePurchaseOrder: (id: string) => api.delete(`/purchase-orders/${id}`),
  sendPurchaseOrder: (id: string) => api.post(`/purchase-orders/${id}/send`),
  confirmPurchaseOrder: (id: string) => api.post(`/purchase-orders/${id}/confirm`),
  receivePurchaseOrder: (id: string, data: any) => api.post(`/purchase-orders/${id}/receive`, data),
  cancelPurchaseOrder: (id: string, data: any) => api.post(`/purchase-orders/${id}/cancel`, data),
  getPurchaseOrderStats: () => api.get('/purchase-orders/stats'),
};

// Stock Alert API
export const stockAlertAPI = {
  getStockAlerts: (params?: any) => api.get('/stock-alerts', { params }),
  getUnresolvedAlerts: (params?: any) => api.get('/stock-alerts/unresolved', { params }),
  getStockAlertById: (id: string) => api.get(`/stock-alerts/${id}`),
  createStockAlert: (data: any) => api.post('/stock-alerts', data),
  markAlertAsRead: (id: string) => api.put(`/stock-alerts/${id}/read`),
  resolveAlert: (id: string, data: any) => api.put(`/stock-alerts/${id}/resolve`, data),
  bulkResolveAlerts: (data: any) => api.put('/stock-alerts/bulk-resolve', data),
  checkLowStock: (data: any) => api.post('/stock-alerts/check-low-stock', data),
  getStockAlertStats: () => api.get('/stock-alerts/stats'),
};

// Enhanced Inventory API
export const enhancedInventoryAPI = {
  getWarehouseDashboard: (params?: any) => api.get('/inventory/warehouse-dashboard', { params }),
  performReplenishmentCheck: (data: any) => api.post('/inventory/replenishment-check', data),
  performStockTaking: (data: any) => api.post('/inventory/stock-taking', data),
  processReceiving: (data: any) => api.post('/inventory/receiving', data),
  processPicking: (data: any) => api.post('/inventory/picking', data),
};

export default api;
