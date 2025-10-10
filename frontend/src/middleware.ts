import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes and their required roles
const protectedRoutes = {
  '/dashboard': ['admin', 'manager', 'sales_person'],
  '/admin': ['admin'],
  '/users': ['admin', 'manager', 'sales_person', 'workshop_employee', 'warehouse_manager', 'warehouse_employee'],
  '/products': ['admin', 'manager'],
  '/customers': ['admin', 'manager', 'sales_person'],
  '/suppliers': ['admin', 'manager'],
  '/invoices': ['admin', 'manager', 'sales_person'],
  '/inventory': ['admin', 'manager', 'warehouse_manager', 'warehouse_employee'],
  '/pos': ['admin', 'manager', 'sales_person'],
  '/sales-outlets': ['admin', 'manager'],
  '/support': ['admin', 'manager', 'sales_person', 'workshop_employee'],
  '/accounts': ['admin', 'manager'],
  '/transactions': ['admin', 'manager'],
  '/workshop': ['admin', 'manager', 'workshop_employee'],
  '/reports': ['admin', 'manager'],
  '/reports-analytics': ['admin', 'manager', 'sales_person', 'warehouse_manager', 'warehouse_employee', 'workshop_employee'],
  '/settings': ['admin', 'manager'],
};

// Define customer routes
const customerRoutes = [
  '/customer',
  '/customer/invoices',
  '/customer/purchases',
  '/customer/support',
];

// Define department-specific routes
const departmentRoutes = {
  sales_person: ['/dashboard', '/pos', '/customers', '/invoices', '/customer-inquiries', '/quotations', '/orders', '/support', '/profile'],
  workshop_employee: ['/workshop', '/customers', '/support', '/profile'],
  warehouse_manager: ['/warehouse-portal', '/inventory', '/deliveries', '/profile'],
  warehouse_employee: ['/warehouse-portal', '/inventory', '/deliveries', '/profile'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/' ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Check if it's a protected route
  const isProtectedRoute = Object.keys(protectedRoutes).some(route => 
    pathname.startsWith(route)
  );
  
  const isCustomerRoute = customerRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if it's a department-specific route
  const isDepartmentRoute = Object.values(departmentRoutes).some(routes =>
    routes.some(route => pathname.startsWith(route))
  );

  // If it's a protected route, customer route, or department route, redirect to login
  // The actual role checking will be handled by the RouteProtection component
  if (isProtectedRoute || isCustomerRoute || isDepartmentRoute) {
    // Store the intended path for redirect after login
    const response = NextResponse.next();
    response.cookies.set('intendedPath', pathname);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
