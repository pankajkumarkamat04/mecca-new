export type ModuleAction = {
  module: string;
  action: string;
};

// Map route prefixes to required permissions
export const routePermissionMap: Array<{
  prefix: string;
  permission?: ModuleAction;
  roles?: string[]; // optional role whitelist
}> = [
  { prefix: '/dashboard' },
  { prefix: '/pos', permission: { module: 'pos', action: 'read' } },
  { prefix: '/sales-outlets', roles: ['admin', 'manager'] },
  { prefix: '/workshop', permission: { module: 'workshop', action: 'read' } },
  { prefix: '/service-templates', permission: { module: 'workshop', action: 'read' } },
  { prefix: '/users', permission: { module: 'users', action: 'read' } },
  { prefix: '/products', permission: { module: 'products', action: 'read' } },
  { prefix: '/customers', permission: { module: 'customers', action: 'read' } },
  { prefix: '/suppliers', permission: { module: 'suppliers', action: 'read' } },
  { prefix: '/invoices', permission: { module: 'invoices', action: 'read' } },
  { prefix: '/inventory', permission: { module: 'inventory', action: 'read' } },
  { prefix: '/support', permission: { module: 'support', action: 'read' } },
  { prefix: '/transactions', permission: { module: 'transactions', action: 'read' } },
  { prefix: '/reports', permission: { module: 'reports', action: 'read' } },
  { prefix: '/settings', permission: { module: 'settings', action: 'read' } },
  { prefix: '/customer-inquiries', permission: { module: 'customerInquiries', action: 'read' } },
  { prefix: '/quotations', permission: { module: 'quotations', action: 'read' } },
  { prefix: '/orders', permission: { module: 'orders', action: 'read' } },
  { prefix: '/deliveries', permission: { module: 'deliveries', action: 'read' } },
  { prefix: '/warehouses', permission: { module: 'warehouses', action: 'read' } },
  { prefix: '/warehouse-portal', roles: ['admin', 'manager', 'employee', 'warehouse_manager', 'warehouse_employee'] },
  { prefix: '/stock-alerts', permission: { module: 'stockAlerts', action: 'read' } },
  { prefix: '/purchase-orders', permission: { module: 'purchaseOrders', action: 'read' } },
  { prefix: '/analytics', permission: { module: 'reports', action: 'read' } },
  { prefix: '/resources', permission: { module: 'resources', action: 'read' } },
  { prefix: '/received-goods', permission: { module: 'receivedGoods', action: 'read' } },
  // Customer portal
  { prefix: '/customer', roles: ['customer'] },
  { prefix: '/profile' },
];

export function findRequiredPermission(pathname: string) {
  const match = routePermissionMap.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'));
  return match;
}


