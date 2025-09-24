'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  BellIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotification: (id: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
  onClearAll,
  isOpen,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') {
      return !notification.read;
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'error':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
      
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center">
              <BellIcon className="h-6 w-6 text-gray-400" />
              <h2 className="ml-3 text-lg font-semibold text-gray-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    {unreadCount}
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="border-b border-gray-200 px-6 py-3">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium',
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium',
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div className="border-b border-gray-200 px-6 py-3">
              <div className="flex justify-between">
                <button
                  onClick={onMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </button>
                <button
                  onClick={onClearAll}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filter === 'unread' ? 'No unread notifications' : 'You\'re all caught up!'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'relative rounded-lg border-l-4 p-4 transition-colors',
                      getNotificationColor(notification.type),
                      !notification.read && 'ring-1 ring-blue-200'
                    )}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {notification.timestamp.toLocaleTimeString()}
                            </span>
                            <button
                              onClick={() => onClearNotification(notification.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-700">
                          {notification.message}
                        </p>
                        {notification.action && (
                          <div className="mt-3">
                            <button
                              onClick={notification.action.onClick}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {notification.action.label}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => onMarkAsRead(notification.id)}
                        className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
