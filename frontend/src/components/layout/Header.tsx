'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, title }) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 lg:hidden"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          {title && (
            <h1 className="ml-4 text-xl font-semibold text-gray-900 lg:ml-0">
              {title}
            </h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <BellIcon className="h-6 w-6" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">New invoice #INV-001 created</p>
                        <p className="text-xs text-gray-500">2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">Low stock alert for Product A</p>
                        <p className="text-xs text-gray-500">1 hour ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">Payment received for Invoice #INV-002</p>
                        <p className="text-xs text-gray-500">3 hours ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <a
                      href="/notifications"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View all notifications
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              {user?.avatar ? (
                <img
                  className="h-8 w-8 rounded-full"
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                />
              ) : (
                <UserCircleIcon className="h-8 w-8" />
              )}
              <span className="hidden md:block text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </span>
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <a
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <UserCircleIcon className="mr-3 h-5 w-5" />
                    Your Profile
                  </a>
                  <a
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <CogIcon className="mr-3 h-5 w-5" />
                    Settings
                  </a>
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={() => {
                      // Handle logout
                      setShowUserMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span className="mr-3">🚪</span>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
