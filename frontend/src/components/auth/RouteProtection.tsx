'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessPath, getDefaultRoute, UserRole, ROLE_ROUTES } from '@/lib/roleRouting';

interface RouteProtectionProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  allowedRoles?: UserRole[];
}

const RouteProtection: React.FC<RouteProtectionProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles 
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't check routes during loading
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      // Store current path for redirect after login
      localStorage.setItem('intendedPath', pathname);
      router.push('/auth/login');
      return;
    }

    // Check role-based access
    if (requiredRole || allowedRoles) {
      const userRole = user.role;
      const rolesToCheck = requiredRole || allowedRoles || [];
      const roleArray = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
      
      if (!roleArray.includes(userRole)) {
        // User doesn't have required role, redirect to their default dashboard
        const defaultPath = getDefaultRoute(userRole);
        router.push(defaultPath);
        return;
      }
    }

    // Check if user can access the current path based on their role
    if (!canAccessPath(user.role, pathname)) {
      // User can't access this path, redirect to their default dashboard
      const defaultPath = getDefaultRoute(user.role);
      router.push(defaultPath);
      return;
    }
  }, [user, isLoading, isAuthenticated, pathname, router, requiredRole, allowedRoles]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or if user doesn't have access
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role-based access
  if (requiredRole || allowedRoles) {
    const userRole = user.role;
    const rolesToCheck = requiredRole || allowedRoles || [];
    const roleArray = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
    
    if (!roleArray.includes(userRole)) {
      return null;
    }
  }

  // Check if user can access the current path
  if (!canAccessPath(user.role, pathname)) {
    return null;
  }

  return <>{children}</>;
};

export default RouteProtection;
