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
  { prefix: '/workshop', permission: { module: 'workshop', action: 'read' } },
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
  // Customer portal
  { prefix: '/customer', roles: ['customer'] },
  { prefix: '/profile' },
];

export function findRequiredPermission(pathname: string) {
  const match = routePermissionMap.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'));
  return match;
}


