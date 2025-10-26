'use client';

import React, { useState, useEffect } from 'react';
import { useSessionTimeoutContext } from '@/contexts/SessionTimeoutContext';
import { useAuth } from '@/contexts/AuthContext';
import { ClockIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface SessionManagerProps {
  className?: string;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ className = '' }) => {
  const { getTimeUntilTimeout, getTimeUntilWarning, resetTimeout } = useSessionTimeoutContext();
  const { user } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isWarning, setIsWarning] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      setIsVisible(false);
      return;
    }

    const updateTimer = () => {
      const timeUntilTimeout = getTimeUntilTimeout();
      const timeUntilWarning = getTimeUntilWarning();
      
      setTimeRemaining(timeUntilTimeout);
      setIsWarning(timeUntilWarning <= 0 && timeUntilTimeout > 0);
      
      // Show manager if warning is active or if there's less than 5 minutes left
      setIsVisible(isWarning || timeUntilTimeout < 5 * 60 * 1000);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [user, getTimeUntilTimeout, getTimeUntilWarning, isWarning]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (isWarning) return 'text-red-600 bg-red-50 border-red-200';
    if (timeRemaining < 2 * 60 * 1000) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (isWarning) return <ExclamationTriangleIcon className="h-4 w-4" />;
    if (timeRemaining < 2 * 60 * 1000) return <ClockIcon className="h-4 w-4" />;
    return <CheckCircleIcon className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isWarning) return 'Session expires soon!';
    if (timeRemaining < 2 * 60 * 1000) return 'Session expiring';
    return 'Session active';
  };

  if (!isVisible || !user) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border cursor-pointer hover:shadow-xl transition-all duration-200 ${getStatusColor()}`}
        onClick={resetTimeout}
        title="Click to extend session"
      >
        {getStatusIcon()}
        <div className="text-sm">
          <div className="font-medium">{getStatusText()}</div>
          <div className="text-xs opacity-75">{formatTime(timeRemaining)} remaining</div>
        </div>
      </div>
    </div>
  );
};
