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
  getCustomerByPhone: (phone: string) => api.get(`/customers/by-phone/${phone}`),
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
  checkInventoryAvailability: (data: any) => api.post('/quotations/check-inventory', data),
  generatePickingList: (id: string) => api.post(`/quotations/${id}/generate-picking-list`),
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
  assignOrder: (id: string, assignedTo?: string, warehouse?: string) => 
    api.put(`/orders/${id}/assign`, { assignedTo, warehouse }),
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
  assignManager: (id: string, managerId: string) => 
    api.put(`/warehouses/${id}/assign-manager`, { managerId }),
  addEmployee: (id: string, data: any) => api.post(`/warehouses/${id}/employees`, data),
  removeEmployee: (id: string, employeeId: string) => 
    api.delete(`/warehouses/${id}/employees/${employeeId}`),
  getWarehouseEmployees: (id: string) => api.get(`/warehouses/${id}/employees`),
  getAvailableUsers: () => api.get('/warehouses/available-users'),
  getWarehouseDashboard: (id: string) => api.get(`/warehouses/${id}/dashboard`),
  getWarehouseOrders: (id: string, params?: any) => api.get(`/warehouses/${id}/orders`, { params }),
  updateInventory: (warehouseId: string, productId: string, data: any) => 
    api.put(`/warehouses/${warehouseId}/inventory/${productId}`, data),
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

// Stock Alert API (Real-time based on inventory data)
export const stockAlertAPI = {
  getStockAlerts: (params?: any) => api.get('/inventory/stock-alerts', { params }),
  getUnresolvedAlerts: (params?: any) => api.get('/inventory/stock-alerts', { params: { ...params, isResolved: false } }),
  getStockAlertById: (id: string) => api.get(`/inventory/stock-alerts/${id}`),
  createStockAlert: (data: any) => api.post('/inventory/stock-alerts', data),
  markAlertAsRead: (id: string) => api.put(`/inventory/stock-alerts/${id}/read`),
  resolveAlert: (id: string, data: any) => api.put(`/inventory/stock-alerts/${id}/resolve`, data),
  bulkResolveAlerts: (data: any) => api.put('/inventory/stock-alerts/bulk-resolve', data),
  checkLowStock: (data: any) => api.post('/inventory/check-low-stock', data),
  getStockAlertStats: () => api.get('/inventory/stock-alert-stats'),
  getReplenishmentSuggestions: (params?: any) => api.get('/inventory/stock-alerts', { params }),
  createPurchaseOrdersFromSuggestions: (data: any) => api.post('/inventory/stock-alerts/create-purchase-orders', data),
  updateInventoryLevels: (data: any) => api.post('/inventory/stock-alerts/update-inventory-levels', data),
};

// Enhanced Inventory API
export const enhancedInventoryAPI = {
  getWarehouseDashboard: (params?: any) => api.get('/inventory/warehouse-dashboard', { params }),
  performReplenishmentCheck: (data: any) => api.post('/inventory/replenishment-check', data),
  performStockTaking: (data: any) => api.post('/inventory/stock-taking', data),
  processReceiving: (data: any) => api.post('/inventory/receiving', data),
  processPicking: (data: any) => api.post('/inventory/picking', data),
};

// Customer Inquiries API
export const customerInquiriesAPI = {
  getCustomerInquiries: (params?: any) => api.get('/customer-inquiries', { params }),
  getCustomerInquiryById: (id: string) => api.get(`/customer-inquiries/${id}`),
  createCustomerInquiry: (data: any) => api.post('/customer-inquiries', data),
  updateCustomerInquiry: (id: string, data: any) => api.put(`/customer-inquiries/${id}`, data),
  updateCustomerInquiryStatus: (id: string, data: any) => api.put(`/customer-inquiries/${id}/status`, data),
  assignCustomerInquiry: (id: string, data: any) => api.put(`/customer-inquiries/${id}/assign`, data),
  convertInquiryToQuotation: (id: string) => api.post(`/customer-inquiries/${id}/convert-to-quotation`),
  convertInquiryToOrder: (id: string) => api.post(`/customer-inquiries/${id}/convert-to-order`),
  getCustomerInquiryStats: () => api.get('/customer-inquiries/stats'),
};

// Deliveries API
export const deliveriesAPI = {
  getDeliveries: (params?: any) => api.get('/deliveries', { params }),
  getDeliveryById: (id: string) => api.get(`/deliveries/${id}`),
  createDelivery: (data: any) => api.post('/deliveries', data),
  updateDelivery: (id: string, data: any) => api.put(`/deliveries/${id}`, data),
  updateDeliveryStatus: (id: string, data: any) => api.put(`/deliveries/${id}/status`, data),
  assignDelivery: (id: string, data: any) => api.put(`/deliveries/${id}/assign`, data),
  markAsDelivered: (id: string, data: any) => api.post(`/deliveries/${id}/deliver`, data),
  markAsFailed: (id: string, data: any) => api.post(`/deliveries/${id}/fail`, data),
  getDeliveryStats: () => api.get('/deliveries/stats'),
};

// Machines API
export const machinesAPI = {
  getMachines: (params?: any) => api.get('/machines', { params }),
  getMachineById: (id: string) => api.get(`/machines/${id}`),
  createMachine: (data: any) => api.post('/machines', data),
  updateMachine: (id: string, data: any) => api.put(`/machines/${id}`, data),
  deleteMachine: (id: string) => api.delete(`/machines/${id}`),
  bookMachine: (id: string, data: any) => api.post(`/machines/${id}/book`, data),
  releaseMachine: (id: string) => api.post(`/machines/${id}/release`),
  addMaintenanceRecord: (id: string, data: any) => api.post(`/machines/${id}/maintenance`, data),
  getMachineStats: () => api.get('/machines/stats'),
};

// Tools API
export const toolsAPI = {
  getTools: (params?: any) => api.get('/tools', { params }),
  getToolById: (id: string) => api.get(`/tools/${id}`),
  createTool: (data: any) => api.post('/tools', data),
  updateTool: (id: string, data: any) => api.put(`/tools/${id}`, data),
  deleteTool: (id: string) => api.delete(`/tools/${id}`),
  assignTool: (id: string, data: any) => api.post(`/tools/${id}/assign`, data),
  returnTool: (id: string, data: any) => api.post(`/tools/${id}/return`, data),
  addMaintenanceRecord: (id: string, data: any) => api.post(`/tools/${id}/maintenance`, data),
  calibrateTool: (id: string, data: any) => api.post(`/tools/${id}/calibrate`, data),
  getToolStats: () => api.get('/tools/stats'),
};

// Workstations API
export const workstationsAPI = {
  getWorkStations: (params?: any) => api.get('/workstations', { params }),
  getWorkStationById: (id: string) => api.get(`/workstations/${id}`),
  createWorkStation: (data: any) => api.post('/workstations', data),
  updateWorkStation: (id: string, data: any) => api.put(`/workstations/${id}`, data),
  deleteWorkStation: (id: string) => api.delete(`/workstations/${id}`),
  bookWorkStation: (id: string, data: any) => api.post(`/workstations/${id}/book`, data),
  releaseWorkStation: (id: string, data: any) => api.post(`/workstations/${id}/release`, data),
  scheduleMaintenance: (id: string, data: any) => api.post(`/workstations/${id}/maintenance`, data),
  getWorkStationStats: () => api.get('/workstations/stats'),
};

// Technicians API
export const techniciansAPI = {
  getTechnicians: (params?: any) => api.get('/technicians', { params }),
  getTechnicianById: (id: string) => api.get(`/technicians/${id}`),
  createTechnician: (data: any) => api.post('/technicians', data),
  updateTechnician: (id: string, data: any) => api.put(`/technicians/${id}`, data),
  deleteTechnician: (id: string) => api.delete(`/technicians/${id}`),
  addSkill: (id: string, data: any) => api.post(`/technicians/${id}/skills`, data),
  addCertification: (id: string, data: any) => api.post(`/technicians/${id}/certifications`, data),
  requestLeave: (id: string, data: any) => api.post(`/technicians/${id}/leave`, data),
  updateLeaveStatus: (id: string, leaveId: string, data: any) => api.put(`/technicians/${id}/leave/${leaveId}`, data),
  assignJob: (id: string, data: any) => api.post(`/technicians/${id}/assign-job`, data),
  completeJob: (id: string, data: any) => api.post(`/technicians/${id}/complete-job`, data),
  updatePerformance: (id: string, data: any) => api.post(`/technicians/${id}/performance`, data),
  getTechnicianStats: () => api.get('/technicians/stats'),
};

// Enhanced Workshop API
export const enhancedWorkshopAPI = {
  // Basic operations
  getJobs: (params?: any) => api.get('/workshop', { params }),
  getJobById: (id: string) => api.get(`/workshop/${id}`),
  createJob: (data: any) => api.post('/workshop', data),
  updateJob: (id: string, data: any) => api.put(`/workshop/${id}`, data),
  scheduleJob: (id: string, data: any) => api.put(`/workshop/${id}/schedule`, data),
  updateJobProgress: (id: string, data: any) => api.put(`/workshop/${id}/progress`, data),
  completeJob: (id: string) => api.post(`/workshop/${id}/complete`),
  cancelJob: (id: string) => api.put(`/workshop/${id}/cancel`),
  deleteJob: (id: string) => api.delete(`/workshop/${id}`),
  updateJobResources: (id: string, data: any) => api.put(`/workshop/${id}/update-resources`, data),
  updateJobTask: (id: string, data: any) => api.put(`/workshop/${id}/update-task`, data),
  
  // Resource management
  assignTechnician: (id: string, data: any) => api.put(`/workshop/${id}/assign-technician`, data),
  removeTechnician: (id: string, data: any) => api.put(`/workshop/${id}/remove-technician`, data),
  bookMachine: (id: string, data: any) => api.post(`/workshop/${id}/book-machine`, data),
  bookWorkStation: (id: string, data: any) => api.post(`/workshop/${id}/book-workstation`, data),
  assignTool: (id: string, data: any) => api.post(`/workshop/${id}/assign-tool`, data),
  
  // Task management
  addTask: (id: string, data: any) => api.post(`/workshop/${id}/tasks`, data),
  updateTaskStatus: (id: string, taskId: string, data: any) => api.put(`/workshop/${id}/tasks/${taskId}`, data),
  
  // Inventory management
  checkPartsAvailability: (id: string) => api.get(`/workshop/${id}/check-parts`),
  reserveParts: (id: string) => api.post(`/workshop/${id}/reserve-parts`),
  
  // Resource availability
  getAvailableResources: (id: string, type?: string) => api.get(`/workshop/${id}/available-resources`, { params: { type } }),
  
  // Statistics and customer portal
  getJobStats: () => api.get('/workshop/stats'),
  getCustomerJobs: (customerId: string) => api.get(`/workshop/customer/${customerId}`),
  
  // Enhanced job card management
  updateJobCard: (id: string, data: any) => api.put(`/workshop/${id}/job-card`, data),
  addCustomerComment: (id: string, data: any) => api.post(`/workshop/${id}/customer-comment`, data),
  addStatusUpdate: (id: string, data: any) => api.post(`/workshop/${id}/status-update`, data),
  
  // Resource conflict detection
  checkResourceConflicts: (id: string) => api.get(`/workshop/${id}/check-conflicts`),
  
  // Analytics and insights
  getJobAnalytics: (id: string) => api.get(`/workshop/${id}/analytics`),
  getWorkshopDashboard: (params?: any) => api.get('/workshop/dashboard', { params }),
};

// Reports & Analytics API
export const reportsAnalyticsAPI = {
  // Dashboard Summary
  getDashboardSummary: () => api.get('/reports-analytics/dashboard'),
  
  // Order Analytics
  getOrderAnalytics: (params?: any) => api.get('/reports-analytics/orders', { params }),
  
  // POS Sales Analytics
  getPOSSalesAnalytics: (params?: any) => api.get('/reports-analytics/pos-sales', { params }),
  
  // Workshop Analytics
  getWorkshopAnalytics: (params?: any) => api.get('/reports-analytics/workshop', { params }),
  
  // Inventory Analytics
  getInventoryAnalytics: (params?: any) => api.get('/reports-analytics/inventory', { params }),
};

export default api;
