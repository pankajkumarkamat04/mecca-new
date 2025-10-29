import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { SESSION_CONFIG, ACTIVITY_EVENTS } from '@/config/session';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
}

export const useSessionTimeout = (options: UseSessionTimeoutOptions = {}) => {
  const {
    timeoutMinutes = SESSION_CONFIG.TIMEOUT_MINUTES,
    warningMinutes = SESSION_CONFIG.WARNING_MINUTES,
    onTimeout,
    onWarning
  } = options;

  const { logout } = useAuth();
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isWarningShownRef = useRef<boolean>(false);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;

  const refreshTokenIfNeeded = useCallback(async () => {
    try {
      const response = await authAPI.refreshToken();
      if (response?.data?.token) {
        localStorage.setItem('token', response.data.token);
        if (response?.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        console.log('Token refreshed successfully');
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
    return false;
  }, []);

  const resetTimeout = useCallback(async () => {
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Reset warning flag
    isWarningShownRef.current = false;

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Try to refresh token on activity (every configured interval)
    const timeSinceLastRefresh = Date.now() - (lastActivityRef.current || 0);
    if (timeSinceLastRefresh > SESSION_CONFIG.TOKEN_REFRESH_INTERVAL_MINUTES * 60 * 1000) {
      await refreshTokenIfNeeded();
    }

    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      if (!isWarningShownRef.current) {
        isWarningShownRef.current = true;
        
        const toastId = toast(
          (t) => {
            // Create dismiss button dynamically
            const message = `You will be logged out in ${warningMinutes} minute${warningMinutes > 1 ? 's' : ''} due to inactivity. Click anywhere to stay logged in.`;
            
            return (
              <div 
                className="flex items-center justify-between gap-4"
                onClick={(e) => {
                  // If clicking the dismiss button, don't reset timeout
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'BUTTON' || target.closest('button')) {
                    return;
                  }
                  // Reset timeout and dismiss on click
                  resetTimeout();
                  toast.dismiss(t.id);
                }}
              >
                <span className="flex-1">{message}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                    isWarningShownRef.current = false;
                    resetTimeout();
                  }}
                  className="flex-shrink-0 ml-2 text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded p-1"
                  aria-label="Close notification"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            );
          },
          {
            duration: warningMs,
            position: 'top-center',
            style: {
              background: '#f59e0b',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '500',
              padding: '0',
              minWidth: '400px'
            },
            icon: '⚠️'
          }
        );
        
        if (onWarning) {
          onWarning();
        }
      }
    }, timeoutMs - warningMs);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [timeoutMs, warningMs, warningMinutes, onWarning, refreshTokenIfNeeded]);

  const handleLogout = useCallback(async () => {
    try {
      // Clear all timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }

      // Show logout message
      toast.error('Session expired due to inactivity. Please login again.', {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#ef4444',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500'
        }
      });

      // Call custom onTimeout if provided
      if (onTimeout) {
        onTimeout();
      }

      // Logout user
      await logout();
      
      // Redirect to login page
      router.push('/auth/login');
    } catch (error) {
      console.error('Error during automatic logout:', error);
    }
  }, [logout, router, onTimeout]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset if there's been significant activity (more than configured interval)
    if (timeSinceLastActivity > SESSION_CONFIG.MIN_ACTIVITY_INTERVAL_SECONDS * 1000) {
      resetTimeout();
    }
  }, [resetTimeout]);

  useEffect(() => {
    // Set up activity listeners
    const events = ACTIVITY_EVENTS;

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timeout
    resetTimeout();

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [handleActivity, resetTimeout]);

  // Return methods for manual control
  return {
    resetTimeout,
    handleLogout,
    getTimeUntilTimeout: () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      return Math.max(0, timeoutMs - timeSinceLastActivity);
    },
    getTimeUntilWarning: () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      return Math.max(0, (timeoutMs - warningMs) - timeSinceLastActivity);
    }
  };
};
