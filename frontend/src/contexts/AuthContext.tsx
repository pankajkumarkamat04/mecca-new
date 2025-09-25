'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';
import { getRedirectPath, UserRole } from '@/lib/roleRouting';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  permissions?: Array<{
    module: string;
    actions: string[];
  }>;
  wallet?: {
    balance: number;
    currency: string;
  };
  preferences?: {
    language: string;
    timezone: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, intendedPath?: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  hasPermission: (module: string, action: string) => boolean;
  hasRole: (roles: string | string[]) => boolean;
  getRedirectPath: (intendedPath?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token with server
          try {
            const response = await authAPI.getMe();
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          } catch (error) {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, intendedPath?: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login({ email, password });
      const { token: newToken, user: userData } = response.data;

      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));

      toast.success('Login successful!');
      
      // Store intended path for redirection after login
      if (intendedPath) {
        localStorage.setItem('intendedPath', intendedPath);
      }
    } catch (error: any) {
      const message = error.formattedMessage || error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      toast.success('Registration successful!');
    } catch (error: any) {
      const message = error.formattedMessage || error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout API if token exists
      if (token) {
        try {
          await authAPI.logout();
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error);
        }
      }
      
      // Clear local state and storage
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if there's an error
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check user permissions
    if (user.permissions) {
      const modulePermission = user.permissions.find(p => p.module === module);
      if (modulePermission && modulePermission.actions.includes(action)) {
        return true;
      }
    }
    
    // Role-based permissions
    const rolePermissions: Record<string, Record<string, string[]>> = {
      admin: {
        users: ['read', 'create', 'update', 'delete'],
        products: ['read', 'create', 'update', 'delete'],
        customers: ['read', 'create', 'update', 'delete'],
        suppliers: ['read', 'create', 'update', 'delete'],
        invoices: ['read', 'create', 'update', 'delete'],
        inventory: ['read', 'create', 'update', 'delete'],
        pos: ['read', 'create', 'update', 'delete'],
        reports: ['read'],
        support: ['read', 'create', 'update', 'delete'],
        accounts: ['read', 'create', 'update', 'delete'],
        transactions: ['read', 'create', 'update', 'delete'],
        workshop: ['read', 'create', 'update', 'delete'],
        settings: ['read', 'create', 'update', 'delete'],
      },
      manager: {
        users: ['read', 'create', 'update'],
        products: ['read', 'create', 'update'],
        customers: ['read', 'create', 'update'],
        suppliers: ['read', 'create', 'update'],
        invoices: ['read', 'create', 'update'],
        inventory: ['read', 'create', 'update'],
        pos: ['read', 'create', 'update'],
        reports: ['read'],
        support: ['read', 'create', 'update'],
        accounts: ['read'],
        transactions: ['read', 'create'],
        workshop: ['read', 'create', 'update'],
        settings: ['read', 'update'],
      },
      employee: {
        users: ['read'],
        products: ['read', 'update'],
        customers: ['read', 'create', 'update'],
        suppliers: ['read'],
        invoices: ['read', 'create', 'update'],
        inventory: ['read', 'create', 'update'],
        pos: ['read', 'create', 'update'],
        reports: ['read'],
        support: ['read', 'create', 'update'],
        accounts: ['read'],
        transactions: ['read', 'create'],
        workshop: ['read', 'create', 'update'],
        settings: ['read'],
      },
      customer: {
        users: ['read'],
        products: ['read'],
        customers: ['read', 'update'],
        invoices: ['read'],
        support: ['read', 'create', 'update'],
        settings: ['read'],
      },
    };

    const userRolePermissions = rolePermissions[user.role];
    if (userRolePermissions && userRolePermissions[module]) {
      return userRolePermissions[module].includes(action);
    }

    return false;
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const getRedirectPathForUser = (intendedPath?: string): string => {
    if (!user) return '/auth/login';
    return getRedirectPath(user.role, intendedPath);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    updateUser,
    hasPermission,
    hasRole,
    getRedirectPath: getRedirectPathForUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
