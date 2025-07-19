import React, { useState, useEffect } from 'react';
import { Calendar, Check, AlertCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { GoogleCalendarService } from '../../services/calendar/GoogleCalendarService';
import { useAuth } from '../../hooks/useAuth';

interface CalendarConnectButtonProps {
  onConnectionChange?: (connected: boolean) => void;
  className?: string;
}

export const CalendarConnectButton: React.FC<CalendarConnectButtonProps> = ({
  onConnectionChange,
  className = ''
}) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const calendarService = new GoogleCalendarService();

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [user]);

  // Handle OAuth callback from URL
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (code && state === 'google_calendar_auth' && user) {
        setIsConnecting(true);
        
        try {
          const result = await calendarService.handleAuthCallback(code, user.id);
          
          if (result.success) {
            setIsConnected(true);
            setShowSuccess(true);
            setError(null);
            onConnectionChange?.(true);
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Hide success message after 3 seconds
            setTimeout(() => setShowSuccess(false), 3000);
          } else {
            setError(result.error || 'Failed to connect calendar');
          }
        } catch (err) {
          setError('An unexpected error occurred');
        } finally {
          setIsConnecting(false);
        }
      }
    };

    handleCallback();
  }, [user, onConnectionChange]);

  const checkConnectionStatus = async () => {
    if (!user) return;

    try {
      const connected = await calendarService.hasActiveConnection(user.id);
      setIsConnected(connected);
      onConnectionChange?.(connected);
    } catch (err) {
      console.error('Error checking calendar connection:', err);
    }
  };

  const handleConnect = async () => {
    if (!user) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Add state parameter to verify the callback
      const authUrl = calendarService.getAuthUrl() + '&state=google_calendar_auth';
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (err) {
      setError('Failed to initiate calendar connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    setIsConnecting(true);
    setError(null);

    try {
      const result = await calendarService.disconnectCalendar(user.id);
      
      if (result.success) {
        setIsConnected(false);
        onConnectionChange?.(false);
      } else {
        setError(result.error || 'Failed to disconnect calendar');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  const dismissError = () => {
    setError(null);
  };

  if (showSuccess) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <Check className="w-5 h-5 text-green-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            Google Calendar Connected!
          </p>
          <p className="text-xs text-green-600">
            Your visits will now sync automatically
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <AlertCircle className="w-5 h-5 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">Connection Failed</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
        <button
          onClick={dismissError}
          className="text-red-400 hover:text-red-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Google Calendar Connected
            </p>
            <p className="text-xs text-blue-600">
              Visits sync automatically to your calendar
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isConnecting}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          {isConnecting ? 'Disconnecting...' : 'Disconnect'}
        </Button>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Calendar className="w-5 h-5 text-gray-600" />
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            Connect Google Calendar
          </h3>
          <p className="text-xs text-gray-600">
            Automatically sync visits to your calendar
          </p>
        </div>
      </div>
      
      <div className="space-y-2 text-xs text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Check className="w-3 h-3 text-green-500" />
          <span>See visits in your Google Calendar</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-3 h-3 text-green-500" />
          <span>Get reminders before each visit</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-3 h-3 text-green-500" />
          <span>Automatic conflict detection</span>
        </div>
      </div>
      
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full"
        size="sm"
      >
        <Calendar className="w-4 h-4 mr-2" />
        {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
      </Button>
      
      <p className="text-xs text-gray-500 mt-2 text-center">
        Your calendar data stays private and secure
      </p>
    </div>
  );
};