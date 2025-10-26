// Session timeout configuration
export const SESSION_CONFIG = {
  // Session timeout in minutes
  TIMEOUT_MINUTES: 10,
  
  // Warning time in minutes before logout
  WARNING_MINUTES: 2,
  
  // Token refresh interval in minutes
  TOKEN_REFRESH_INTERVAL_MINUTES: 5,
  
  // Minimum activity interval in seconds (prevents excessive resets)
  MIN_ACTIVITY_INTERVAL_SECONDS: 30,
  
  // Show session status indicator when time remaining is less than this (minutes)
  SHOW_STATUS_THRESHOLD_MINUTES: 5,
  
  // JWT token expiration in hours (backend setting)
  JWT_EXPIRATION_HOURS: 1,
};

// Activity events that reset the session timeout
export const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
  'focus',
  'blur',
  'resize'
];

// Session status types
export const SESSION_STATUS = {
  ACTIVE: 'active',
  WARNING: 'warning',
  EXPIRED: 'expired'
} as const;

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];
