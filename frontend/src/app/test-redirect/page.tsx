'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { getRedirectPath } from '@/lib/roleRouting';

const TestRedirectPage: React.FC = () => {
  const { user, isAuthenticated, getRedirectPath: getAuthRedirectPath } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please log in to test role-based redirection.</p>
        </div>
      </div>
    );
  }

  const userRole = user.role;
  const defaultRedirect = getRedirectPath(userRole);
  const authRedirect = getAuthRedirectPath();

  return (
    <Layout title="Role-Based Redirection Test">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Role-Based Redirection Test</h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Current User Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-700"><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                  <p className="text-sm text-blue-700"><strong>Email:</strong> {user.email}</p>
                  <p className="text-sm text-blue-700"><strong>Role:</strong> {user.role}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700"><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
                  <p className="text-sm text-blue-700"><strong>Status:</strong> {user.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-900 mb-2">Redirection Logic</h2>
              <div className="space-y-2">
                <p className="text-sm text-green-700"><strong>Default Redirect for {userRole}:</strong> {defaultRedirect}</p>
                <p className="text-sm text-green-700"><strong>Auth Context Redirect:</strong> {authRedirect}</p>
                <p className="text-sm text-green-700"><strong>Current Path:</strong> /test-redirect</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-yellow-900 mb-2">Role-Based Routes</h2>
              <div className="space-y-2">
                {userRole === 'customer' && (
                  <>
                    <p className="text-sm text-yellow-700">✓ Customer Dashboard: /customer</p>
                    <p className="text-sm text-yellow-700">✓ Customer Invoices: /customer/invoices</p>
                    <p className="text-sm text-yellow-700">✓ Customer Support: /customer/support</p>
                    <p className="text-sm text-yellow-700">✓ Profile: /profile</p>
                  </>
                )}
                {userRole !== 'customer' && (
                  <>
                    <p className="text-sm text-yellow-700">✓ Admin Dashboard: /dashboard</p>
                    <p className="text-sm text-yellow-700">✓ Users Management: /users</p>
                    <p className="text-sm text-yellow-700">✓ Products: /products</p>
                    <p className="text-sm text-yellow-700">✓ Customers: /customers</p>
                    <p className="text-sm text-yellow-700">✓ Reports: /reports</p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-purple-900 mb-2">How It Works</h2>
              <div className="space-y-2 text-sm text-purple-700">
                <p>1. User logs in with their credentials</p>
                <p>2. System checks their role (admin, manager, employee, customer)</p>
                <p>3. User is automatically redirected to their role-specific dashboard</p>
                <p>4. Route protection prevents access to unauthorized pages</p>
                <p>5. All role-based redirection is handled at the login level</p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Test Login Redirect
              </button>
              <button
                onClick={() => window.location.href = defaultRedirect}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Go to My Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TestRedirectPage;
