'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/contexts/AuthContext';

interface SessionTimeoutContextType {
  resetTimeout: () => void;
  handleLogout: () => Promise<void>;
  getTimeUntilTimeout: () => number;
  getTimeUntilWarning: () => number;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

interface SessionTimeoutProviderProps {
  children: ReactNode;
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export const SessionTimeoutProvider: React.FC<SessionTimeoutProviderProps> = ({
  children,
  timeoutMinutes = 10,
  warningMinutes = 2
}) => {
  const { user } = useAuth();

  const sessionTimeout = useSessionTimeout({
    timeoutMinutes,
    warningMinutes,
    onTimeout: () => {
      console.log('Session timeout reached - user will be logged out');
    },
    onWarning: () => {
      console.log('Session warning - user will be logged out soon');
    }
  });

  // Only enable session timeout for authenticated users
  const contextValue = user ? sessionTimeout : {
    resetTimeout: () => {},
    handleLogout: async () => {},
    getTimeUntilTimeout: () => 0,
    getTimeUntilWarning: () => 0
  };

  return (
    <SessionTimeoutContext.Provider value={contextValue}>
      {children}
    </SessionTimeoutContext.Provider>
  );
};

export const useSessionTimeoutContext = () => {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error('useSessionTimeoutContext must be used within a SessionTimeoutProvider');
  }
  return context;
};
