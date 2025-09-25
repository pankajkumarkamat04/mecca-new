import { type ClassValue, clsx } from 'clsx';
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Date utilities
export const formatDate = (date: string | Date, formatString = 'MMM dd, yyyy') => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid Date';
    return format(dateObj, formatString);
  } catch {
    return 'Invalid Date';
  }
};

export const formatDateTime = (date: string | Date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatTime = (date: string | Date) => {
  return formatDate(date, 'HH:mm');
};

// Currency formatting
export const formatCurrency = (amount: any, currency = 'USD') => {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(safe);
};

// Build printable invoice HTML for a popup window
export const buildPrintableInvoiceHTML = (invoice: any, company?: any) => {
  const toNumber = (v: any, fb = 0) => {
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isFinite(n) ? n : fb;
  };

  const items = invoice?.items || [];
  const lineBase = (it: any) => toNumber(it.unitPrice) * toNumber(it.quantity);
  const lineDiscount = (it: any) => (lineBase(it) * toNumber(it.discount)) / 100;
  const lineAfterDiscount = (it: any) => lineBase(it) - lineDiscount(it);
  const lineTax = (it: any) => (lineAfterDiscount(it) * toNumber(it.taxRate)) / 100;
  const computedSubtotal = items.reduce((s: number, it: any) => s + lineBase(it), 0);
  const computedTotalDiscount = items.reduce((s: number, it: any) => s + lineDiscount(it), 0);
  const computedTotalTax = items.reduce((s: number, it: any) => s + lineTax(it), 0);
  const shippingCost = toNumber(invoice?.shipping?.cost);
  const subtotal = toNumber(invoice?.subtotal, computedSubtotal);
  const totalDiscount = toNumber(invoice?.totalDiscount, computedTotalDiscount);
  const totalTax = toNumber(invoice?.totalTax, computedTotalTax);
  const total = toNumber(invoice?.total, subtotal - totalDiscount + totalTax + shippingCost);
  const paid = toNumber(invoice?.paid);
  const balance = toNumber(invoice?.balance, Math.max(0, total - paid));

  const logoHtml = company?.logo?.url
    ? `<img src="${company.logo.url}" alt="Logo" style="height:48px;object-fit:contain;" />`
    : '';
  const companyBlock = company
    ? `<div>
        <div style="font-weight:700;font-size:16px;">${company.name || ''}</div>
        <div style="color:#6b7280;">${company.email || ''}${company.phone ? ' · ' + company.phone : ''}</div>
        ${company.address ? `<div style="color:#6b7280;">${company.address.street || ''} ${company.address.city || ''}</div>` : ''}
      </div>`
    : '';
  const customerBlock = typeof invoice?.customer === 'object'
    ? `<div>
        <div style="font-weight:600;">${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}</div>
        <div style="color:#6b7280;">${invoice.customer.email || ''}</div>
        ${invoice.customer.phone ? `<div style="color:#6b7280;">${invoice.customer.phone}</div>` : ''}
      </div>`
    : '<div style="color:#6b7280;">No customer information</div>';

  const itemsRows = items.map((it: any) => {
    const name = it.name || (typeof it.product === 'object' ? it.product?.name : 'Item');
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${toNumber(it.quantity)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${formatCurrency(it.unitPrice)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${formatCurrency(it.total ?? lineAfterDiscount(it) + lineTax(it))}</td>
    </tr>`;
  }).join('');

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Invoice ${invoice?.invoiceNumber || ''}</title>
      <style>
        body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji; color:#111827;}
        .container{max-width:800px;margin:24px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;}
        .muted{color:#6b7280}
        .row{display:flex;justify-content:space-between;align-items:flex-start}
        .title{font-size:20px;font-weight:700}
        .section{margin-top:24px}
        table{width:100%;border-collapse:collapse}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="row">
          <div style="display:flex;align-items:center;gap:12px;">${logoHtml}${companyBlock}</div>
          <div style="text-align:right;">
            <div class="title">Invoice #${invoice?.invoiceNumber || ''}</div>
            <div class="muted">Date: ${typeof invoice?.invoiceDate === 'string' ? invoice.invoiceDate : new Date(invoice?.invoiceDate || Date.now()).toLocaleDateString()}</div>
            ${invoice?.dueDate ? `<div class="muted">Due: ${typeof invoice.dueDate === 'string' ? invoice.dueDate : new Date(invoice.dueDate).toLocaleDateString()}</div>` : ''}
          </div>
        </div>

        <div class="section">
          <div style="font-weight:600;margin-bottom:8px;">Bill To</div>
          ${customerBlock}
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Item</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Qty</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Price</th>
                <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
        </div>

        <div class="section" style="max-width:320px;margin-left:auto;">
          <div class="row muted" style="margin-bottom:6px;"><span>Subtotal:</span><span>${formatCurrency(subtotal)}</span></div>
          <div class="row muted" style="margin-bottom:6px;"><span>Discount:</span><span>-${formatCurrency(totalDiscount)}</span></div>
          <div class="row muted" style="margin-bottom:6px;"><span>Tax:</span><span>${formatCurrency(totalTax)}</span></div>
          <div class="row" style="border-top:1px solid #e5e7eb;padding-top:8px;margin-top:8px;font-weight:700;"><span>Total:</span><span>${formatCurrency(total)}</span></div>
          <div class="row muted" style="margin-top:6px;"><span>Paid:</span><span>${formatCurrency(paid)}</span></div>
          <div class="row" style="font-weight:600;"><span>Due:</span><span>${formatCurrency(balance)}</span></div>
        </div>
      </div>
      <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 300); };</script>
    </body>
  </html>`;

  return html;
};

// Number formatting
export const formatNumber = (num: number, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

// Percentage formatting
export const formatPercentage = (value: number, decimals = 1) => {
  return `${formatNumber(value, decimals)}%`;
};

// String utilities
export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str: string) => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Status utilities
export const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    // General statuses
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    
    // Invoice statuses
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-blue-100 text-blue-800',
    overdue: 'bg-red-100 text-red-800',
    
    // Project statuses
    planning: 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    on_hold: 'bg-orange-100 text-orange-800',
    
    // Task statuses
    todo: 'bg-gray-100 text-gray-800',
    review: 'bg-purple-100 text-purple-800',
    
    // Priority levels
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
    
    // Support ticket statuses
    open: 'bg-red-100 text-red-800',
    'waiting_customer': 'bg-yellow-100 text-yellow-800',
    'waiting_support': 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    
    // Transaction statuses
    draft: 'bg-gray-100 text-gray-800',
    posted: 'bg-green-100 text-green-800',
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusIcon = (status: string) => {
  const statusIcons: Record<string, string> = {
    active: '✓',
    inactive: '✗',
    pending: '⏳',
    approved: '✓',
    rejected: '✗',
    completed: '✓',
    cancelled: '✗',
    paid: '💰',
    partial: '💰',
    overdue: '⚠️',
    planning: '📋',
    'in_progress': '🔄',
    on_hold: '⏸️',
    todo: '📝',
    review: '👀',
    low: '🔽',
    medium: '🔸',
    high: '🔺',
    urgent: '🚨',
    open: '🔴',
    'waiting_customer': '⏳',
    'waiting_support': '⏳',
    resolved: '✅',
    closed: '🔒',
    draft: '📄',
    posted: '📋',
  };
  
  return statusIcons[status] || '❓';
};

// File utilities
export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// Validation utilities
export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

export const validatePassword = (password: string) => {
  // At least 6 characters
  return password.length >= 6;
};

// Search and filter utilities
export const searchItems = <T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] => {
  if (!searchTerm) return items;
  
  const term = searchTerm.toLowerCase();
  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term);
      }
      if (typeof value === 'number') {
        return value.toString().includes(term);
      }
      return false;
    })
  );
};

export const sortItems = <T>(
  items: T[],
  sortBy: keyof T,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...items].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

// Pagination utilities
export const paginateItems = <T>(
  items: T[],
  page: number,
  limit: number
): { items: T[]; totalPages: number; totalItems: number } => {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = items.slice(startIndex, endIndex);
  
  return {
    items: paginatedItems,
    totalPages,
    totalItems,
  };
};

// Local storage utilities
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setToStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const removeFromStorage = (key: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// URL utilities
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  
  return searchParams.toString();
};

export const parseQueryString = (queryString: string): Record<string, string> => {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(queryString);
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Generate random ID
export const generateId = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

// Color utilities
export const getRandomColor = (): string => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-gray-500',
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
};

// Deep clone utility
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

// API Error handling utilities
export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
    location?: string;
  }>;
  details?: any;
}

export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const getValidationErrors = (error: any): Array<{
  field: string;
  message: string;
  value?: any;
  location?: string;
}> => {
  if (error?.response?.data?.errors) {
    return error.response.data.errors;
  }
  return [];
};

export const formatValidationErrors = (error: any): string => {
  const validationErrors = getValidationErrors(error);
  if (validationErrors.length === 0) {
    return getErrorMessage(error);
  }
  
  return validationErrors
    .map(err => `${err.field}: ${err.message}`)
    .join(', ');
};

export const hasValidationErrors = (error: any): boolean => {
  return getValidationErrors(error).length > 0;
};