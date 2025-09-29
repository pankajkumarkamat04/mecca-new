/**
 * Role-based routing utility
 * Handles redirection based on user roles
 */

export type UserRole = 'admin' | 'manager' | 'employee' | 'customer' | 'warehouse_manager' | 'warehouse_employee';

export interface RoleRoute {
  role: UserRole;
  defaultPath: string;
  allowedPaths: string[];
}

export const ROLE_ROUTES: Record<UserRole, RoleRoute> = {
  admin: {
    role: 'admin',
    defaultPath: '/dashboard',
    allowedPaths: ['/dashboard', '/users', '/products', '/customers', '/suppliers', '/invoices', '/inventory', '/pos', '/support', '/accounts', '/transactions', '/workshop', '/reports', '/settings', '/analytics', '/customer-inquiries', '/quotations', '/orders', '/deliveries', '/warehouses', '/warehouse-portal', '/stock-alerts', '/purchase-orders', '/resources', '/profile']
  },
  manager: {
    role: 'manager',
    defaultPath: '/dashboard',
    allowedPaths: ['/dashboard', '/users', '/products', '/customers', '/suppliers', '/invoices', '/inventory', '/pos', '/support', '/accounts', '/transactions', '/workshop', '/reports', '/settings', '/customer-inquiries', '/quotations', '/orders', '/deliveries', '/warehouses', '/warehouse-portal', '/stock-alerts', '/purchase-orders', '/resources', '/profile']
  },
  employee: {
    role: 'employee',
    defaultPath: '/dashboard',
    allowedPaths: ['/dashboard', '/products', '/customers', '/invoices', '/inventory', '/pos', '/support', '/accounts', '/transactions', '/workshop', '/reports', '/customer-inquiries', '/quotations', '/orders', '/deliveries', '/warehouse-portal', '/resources', '/profile']
  },
  customer: {
    role: 'customer',
    defaultPath: '/customer',
    allowedPaths: ['/customer', '/customer/invoices', '/customer/purchases', '/customer/wallet', '/customer/support', '/customer/inquiries', '/customer/quotations', '/customer/orders', '/customer/workshop', '/profile']
  },
  warehouse_manager: {
    role: 'warehouse_manager',
    defaultPath: '/warehouse-portal',
    allowedPaths: ['/warehouse-portal', '/warehouse-portal/dashboard', '/warehouse-portal/orders', '/warehouse-portal/inventory', '/warehouse-portal/employees', '/warehouse-portal/deliveries', '/warehouse-portal/settings', '/profile']
  },
  warehouse_employee: {
    role: 'warehouse_employee',
    defaultPath: '/warehouse-portal',
    allowedPaths: ['/warehouse-portal', '/warehouse-portal/dashboard', '/warehouse-portal/orders', '/warehouse-portal/inventory', '/profile']
  }
};

/**
 * Get the default route for a user role
 */
export const getDefaultRoute = (role: UserRole): string => {
  return ROLE_ROUTES[role]?.defaultPath || '/dashboard';
};

/**
 * Check if a user with a specific role can access a path
 */
export const canAccessPath = (role: UserRole, path: string): boolean => {
  // Handle case where role might be undefined or null
  if (!role) {
    return false;
  }
  
  const roleRoute = ROLE_ROUTES[role];
  if (!roleRoute) {
    return false;
  }
  
  // Check if the path exactly matches or starts with any allowed path
  const canAccess = roleRoute.allowedPaths.some(allowedPath => {
    if (path === allowedPath) return true;
    if (path.startsWith(allowedPath + '/')) return true;
    return false;
  });
  
  return canAccess;
};

/**
 * Get the appropriate redirect path based on user role
 * @param role - User's role
 * @param intendedPath - The path the user was trying to access (optional)
 * @returns The path to redirect to
 */
export const getRedirectPath = (role: UserRole, intendedPath?: string): string => {
  // If there's an intended path and the user can access it, redirect there
  if (intendedPath && canAccessPath(role, intendedPath)) {
    return intendedPath;
  }
  
  // Otherwise, redirect to the default path for their role
  return getDefaultRoute(role);
};

/**
 * Get role-specific dashboard title
 */
export const getDashboardTitle = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Admin Dashboard';
    case 'manager':
      return 'Manager Dashboard';
    case 'employee':
      return 'Employee Dashboard';
    case 'customer':
      return 'Customer Dashboard';
    case 'warehouse_manager':
      return 'Warehouse Manager Dashboard';
    case 'warehouse_employee':
      return 'Warehouse Employee Dashboard';
    default:
      return 'Dashboard';
  }
};
