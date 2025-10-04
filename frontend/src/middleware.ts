import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes and their required roles
const protectedRoutes = {
  '/dashboard': ['admin', 'manager', 'employee'],
  '/admin': ['admin'],
  '/users': ['admin', 'manager'],
  '/products': ['admin', 'manager', 'employee'],
  '/customers': ['admin', 'manager', 'employee'],
  '/suppliers': ['admin', 'manager', 'employee'],
  '/invoices': ['admin', 'manager', 'employee'],
  '/inventory': ['admin', 'manager', 'employee'],
  '/pos': ['admin', 'manager', 'employee'],
  '/support': ['admin', 'manager', 'employee'],
  '/accounts': ['admin', 'manager'],
  '/transactions': ['admin', 'manager', 'employee'],
  '/workshop': ['admin', 'manager', 'employee'],
  '/reports': ['admin', 'manager', 'employee'],
  '/settings': ['admin', 'manager'],
  '/analytics': ['admin'],
};

// Define customer routes
const customerRoutes = [
  '/customer',
  '/customer/invoices',
  '/customer/purchases',
  '/customer/support',
];

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

  // If it's a protected route or customer route, redirect to login
  // The actual role checking will be handled by the RouteProtection component
  if (isProtectedRoute || isCustomerRoute) {
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
