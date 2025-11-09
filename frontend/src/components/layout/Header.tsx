'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
  hideMenuButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, title, hideMenuButton = false }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    // Layout component will handle redirect when isAuthenticated becomes false
  };

  return (
    <header className="bg-gray-100 border-b border-gray-200 shadow-sm">
      <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:py-4">
        {/* Left side */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {!hideMenuButton && (
            <button
              onClick={onMenuClick}
              className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          )}

          {title && (
            <h1 className="truncate text-base font-semibold text-gray-900 sm:text-xl">
              {title}
            </h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
          {/* Search */}
          <div className="hidden min-w-[200px] md:block">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 placeholder-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 rounded-md p-2 text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              aria-expanded={showUserMenu}
            >
              {user?.avatar ? (
                <img
                  className="h-8 w-8 rounded-full object-cover"
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                />
              ) : (
                <UserCircleIcon className="h-8 w-8" />
              )}
              <span className="hidden truncate text-sm font-medium md:block">
                {user?.firstName} {user?.lastName}
              </span>
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <a
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <UserCircleIcon className="mr-3 h-5 w-5" />
                    Your Profile
                  </a>
                  <a
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <CogIcon className="mr-3 h-5 w-5" />
                    Settings
                  </a>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
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
