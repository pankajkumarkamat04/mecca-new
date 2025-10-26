# Session Timeout Security Feature

This document describes the automatic session timeout security feature implemented in the Mecca POS System.

## Overview

The session timeout feature automatically logs out users after a period of inactivity to enhance security and prevent unauthorized access to sensitive business data.

## Features

### 🔒 **Automatic Logout**
- Users are automatically logged out after **10 minutes** of inactivity
- Session timeout is reset on any user activity (mouse movement, clicks, keyboard input, etc.)

### ⚠️ **Warning System**
- Users receive a warning **2 minutes** before automatic logout
- Warning toast notification appears with countdown timer
- Users can click anywhere to extend their session

### 🔄 **Token Refresh**
- JWT tokens are automatically refreshed every **5 minutes** during active use
- Tokens expire after **1 hour** for enhanced security
- Seamless token renewal without user interruption

### 📊 **Session Status Indicator**
- Visual indicator shows remaining session time
- Color-coded status (green: active, yellow: warning, red: critical)
- Clickable to extend session

## Configuration

All session timeout settings can be configured in `frontend/src/config/session.ts`:

```typescript
export const SESSION_CONFIG = {
  // Session timeout in minutes
  TIMEOUT_MINUTES: 10,
  
  // Warning time in minutes before logout
  WARNING_MINUTES: 2,
  
  // Token refresh interval in minutes
  TOKEN_REFRESH_INTERVAL_MINUTES: 5,
  
  // Minimum activity interval in seconds
  MIN_ACTIVITY_INTERVAL_SECONDS: 30,
  
  // Show session status indicator threshold
  SHOW_STATUS_THRESHOLD_MINUTES: 5,
  
  // JWT token expiration in hours
  JWT_EXPIRATION_HOURS: 1,
};
```

## Implementation Details

### Frontend Components

1. **`useSessionTimeout` Hook**
   - Manages session timeout logic
   - Handles activity detection and timeout reset
   - Provides token refresh functionality

2. **`SessionTimeoutProvider`**
   - Context provider for session timeout functionality
   - Wraps the entire application

3. **`SessionStatusIndicator`**
   - Visual component showing session status
   - Displays remaining time and warning states

4. **`SessionManager`**
   - Alternative session management component
   - Can be used in specific pages or layouts

### Backend Changes

1. **JWT Token Expiration**
   - Reduced from 7 days to 1 hour for better security
   - Tokens are refreshed automatically during active use

2. **Token Refresh Endpoint**
   - `POST /api/auth/refresh` - Refreshes JWT tokens
   - Updates user's last activity timestamp

### Activity Detection

The system monitors the following user activities:
- Mouse movements and clicks
- Keyboard input
- Touch events (mobile)
- Scroll events
- Window focus/blur
- Window resize

## Security Benefits

### 🛡️ **Enhanced Security**
- Prevents unauthorized access from unattended sessions
- Reduces risk of data breaches from shared computers
- Complies with security best practices

### 🔐 **Session Management**
- Automatic token refresh prevents session expiration during active use
- Clear warning system gives users control over their sessions
- Graceful logout with proper cleanup

### 📱 **User Experience**
- Non-intrusive warning system
- Visual feedback on session status
- Easy session extension with single click

## Usage Examples

### Basic Implementation
```tsx
import { SessionTimeoutProvider } from '@/contexts/SessionTimeoutContext';
import { SessionStatusIndicator } from '@/components/SessionStatusIndicator';

function App() {
  return (
    <SessionTimeoutProvider>
      <YourAppContent />
      <SessionStatusIndicator />
    </SessionTimeoutProvider>
  );
}
```

### Custom Configuration
```tsx
<SessionTimeoutProvider 
  timeoutMinutes={15} 
  warningMinutes={3}
>
  <YourAppContent />
</SessionTimeoutProvider>
```

### Manual Session Control
```tsx
import { useSessionTimeoutContext } from '@/contexts/SessionTimeoutContext';

function MyComponent() {
  const { resetTimeout, getTimeUntilTimeout } = useSessionTimeoutContext();
  
  const handleExtendSession = () => {
    resetTimeout();
  };
  
  const timeRemaining = getTimeUntilTimeout();
  
  return (
    <div>
      <p>Session expires in: {Math.floor(timeRemaining / 60000)} minutes</p>
      <button onClick={handleExtendSession}>Extend Session</button>
    </div>
  );
}
```

## Testing

### Test Scenarios

1. **Normal Usage**
   - User interacts with the system normally
   - Session timeout resets on activity
   - Token refreshes automatically

2. **Warning Phase**
   - After 8 minutes of inactivity, warning appears
   - User can click to extend session
   - Warning disappears after activity

3. **Automatic Logout**
   - After 10 minutes of inactivity, user is logged out
   - Redirected to login page
   - Session data is cleared

4. **Token Refresh**
   - Token refreshes every 5 minutes during active use
   - User remains logged in seamlessly
   - No interruption to workflow

## Troubleshooting

### Common Issues

1. **Session expires too quickly**
   - Check `MIN_ACTIVITY_INTERVAL_SECONDS` setting
   - Verify activity events are being detected

2. **Warning not showing**
   - Check `WARNING_MINUTES` configuration
   - Verify toast notifications are enabled

3. **Token refresh failing**
   - Check backend `/api/auth/refresh` endpoint
   - Verify JWT secret configuration

### Debug Mode

Enable debug logging by adding console.log statements in the session timeout hook:

```typescript
console.log('Session timeout reset at:', new Date());
console.log('Time until warning:', getTimeUntilWarning());
console.log('Time until logout:', getTimeUntilTimeout());
```

## Future Enhancements

- [ ] Configurable timeout per user role
- [ ] Remember me functionality with longer timeout
- [ ] Session analytics and reporting
- [ ] Multi-device session management
- [ ] Integration with SSO providers

## Security Considerations

- Session timeout is enforced client-side and server-side
- JWT tokens are short-lived for enhanced security
- Activity detection prevents false timeouts during active use
- Proper cleanup ensures no sensitive data remains after logout
- All session data is cleared on timeout or manual logout
