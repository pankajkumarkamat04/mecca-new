'use client';

import React, { useState, useEffect } from 'react';
import { useSessionTimeoutContext } from '@/contexts/SessionTimeoutContext';
import { useAuth } from '@/contexts/AuthContext';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SessionStatusIndicatorProps {
  showAlways?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const SessionStatusIndicator: React.FC<SessionStatusIndicatorProps> = ({
  showAlways = false,
  position = 'top-right'
}) => {
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
      
      // Show indicator if warning is active or if showAlways is true
      setIsVisible(isWarning || showAlways);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [user, getTimeUntilTimeout, getTimeUntilWarning, isWarning, showAlways]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (!isVisible || !user) {
    return null;
  }

  return (
    <div
      className={`fixed ${getPositionClasses()} z-50 transition-all duration-300 ${
        isWarning ? 'animate-pulse' : ''
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border cursor-pointer hover:shadow-xl transition-all duration-200 ${
          isWarning
            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
        }`}
        onClick={resetTimeout}
        title={isWarning ? 'Click to extend session' : 'Session active'}
      >
        {isWarning ? (
          <ExclamationTriangleIcon className="h-4 w-4" />
        ) : (
          <ClockIcon className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isWarning ? 'Session expires in' : 'Session:'} {formatTime(timeRemaining)}
        </span>
      </div>
    </div>
  );
};
