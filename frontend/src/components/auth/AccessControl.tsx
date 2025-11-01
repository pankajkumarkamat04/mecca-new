'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessPath, getDefaultRoute, UserRole } from '@/lib/roleRouting';
import { findRequiredPermission } from '@/lib/permissions';
import toast from 'react-hot-toast';

interface AccessControlProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  allowedRoles?: UserRole[];
  skipAuthPages?: boolean;
  showToast?: boolean;
}

const AccessControl: React.FC<AccessControlProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles,
  skipAuthPages = true,
  showToast = true
}) => {
  const { user, isLoading, isAuthenticated, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't check routes during loading
    if (isLoading) return;

    // Skip auth pages if specified
    if (skipAuthPages && pathname.startsWith('/auth/')) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      // Store current path for redirect after login
      localStorage.setItem('intendedPath', pathname);
      router.push('/auth/login');
      return;
    }

    // Check role-based access (requiredRole or allowedRoles)
    if (requiredRole || allowedRoles) {
      const userRole = user.role;
      const rolesToCheck = requiredRole || allowedRoles || [];
      const roleArray = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
      
      if (!roleArray.includes(userRole)) {
        // User doesn't have required role
        const defaultPath = getDefaultRoute(userRole);
        if (showToast) {
          toast.error('You do not have permission to access this page.');
        }
        router.replace(defaultPath);
        return;
      }
    }

    // Check if user can access the current path based on their role
    if (!canAccessPath(user.role, pathname)) {
      // Check if there's a specific permission requirement
      const permission = findRequiredPermission(pathname);
      
      if (permission?.roles && !permission.roles.includes(user.role)) {
        // User doesn't have the required role for this route
        const defaultPath = getDefaultRoute(user.role);
        if (showToast) {
          toast.error('You do not have permission to access this page.');
        }
        router.replace(defaultPath);
        return;
      }
      
      // Check permission-based access
      if (permission?.permission) {
        // Use the hasPermission function from AuthContext which checks both role-based and user permissions
        const userHasPermission = hasPermission(permission.permission.module, permission.permission.action);
        
        if (!userHasPermission) {
          const defaultPath = getDefaultRoute(user.role);
          if (showToast) {
            toast.error('You do not have the necessary permissions to view this content.');
          }
          router.replace(defaultPath);
          return;
        }
      } else {
        // If no specific permission required but still no access, redirect to default
        const defaultPath = getDefaultRoute(user.role);
        if (showToast) {
          toast.error('You do not have permission to access this page.');
        }
        router.replace(defaultPath);
        return;
      }
    }
  }, [user, isLoading, isAuthenticated, pathname, router, requiredRole, allowedRoles, skipAuthPages, showToast]);

  // Show loading while checking authentication and permissions
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role-based access for rendering
  if (requiredRole || allowedRoles) {
    const userRole = user.role;
    const rolesToCheck = requiredRole || allowedRoles || [];
    const roleArray = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
    
    if (!roleArray.includes(userRole)) {
      return null;
    }
  }

  // Check if user can access the current path for rendering
  if (!canAccessPath(user.role, pathname)) {
    // Check permission-based access for rendering
    const permission = findRequiredPermission(pathname);
    
    if (permission?.roles && !permission.roles.includes(user.role)) {
      return null;
    }
    
    if (permission?.permission) {
      // Use the hasPermission function from AuthContext which checks both role-based and user permissions
      const userHasPermission = hasPermission(permission.permission.module, permission.permission.action);
      
      if (!userHasPermission) {
        return null;
      }
    } else {
      return null;
    }
  }

  return <>{children}</>;
};

export default AccessControl;
