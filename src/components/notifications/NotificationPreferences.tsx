import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Moon, Sun, TestTube, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { NotificationService, type NotificationPreferences as NotificationPrefs } from '../../lib/services/NotificationService';
import { useAuth } from '../../hooks/useAuth';

interface NotificationPreferencesProps {
  className?: string;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [permissionRequested, setPermissionRequested] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
    setPermissionStatus(NotificationService.getPermission());
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const prefs = await NotificationService.getPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setPermissionRequested(true);
    const permission = await NotificationService.requestPermission();
    setPermissionStatus(permission);
  };

  const handleTestNotification = async () => {
    if (!user) return;

    setTestingNotification(true);
    try {
      const result = await NotificationService.sendTestNotification(user.id);
      if (result.success) {
        alert('Test notification sent! Check your browser notifications.');
      } else {
        alert(`Failed to send test notification: ${result.error}`);
      }
    } catch (error) {
      alert('Error sending test notification. Please try again.');
    } finally {
      setTestingNotification(false);
    }
  };

  const updatePreference = async (updates: Partial<NotificationPrefs>) => {
    if (!user) return;

    setSaving(true);
    try {
      const result = await NotificationService.updatePreferences(user.id, updates);
      if (result.success) {
        await loadPreferences(); // Reload to get updated data
      } else {
        alert(`Failed to update preferences: ${result.error}`);
      }
    } catch (error) {
      alert('Error updating preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: keyof NotificationPrefs, value: boolean) => {
    updatePreference({ [field]: value });
  };

  const handleTimeChange = (field: 'quiet_hours_start' | 'quiet_hours_end', value: string) => {
    updatePreference({ [field]: value });
  };

  const handleMaxNotificationsChange = (value: number) => {
    updatePreference({ max_notifications_per_day: value });
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const isNotificationSupported = NotificationService.isSupported();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Permission Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {permissionStatus === 'granted' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : permissionStatus === 'denied' ? (
              <XCircle className="w-6 h-6 text-red-600" />
            ) : (
              <Clock className="w-6 h-6 text-yellow-600" />
            )}
            <div>
              <h3 className="font-medium text-gray-900">Browser Notifications</h3>
              <p className="text-sm text-gray-600">
                {permissionStatus === 'granted' && 'Notifications are enabled'}
                {permissionStatus === 'denied' && 'Notifications are blocked'}
                {permissionStatus === 'default' && 'Permission not yet requested'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {permissionStatus === 'granted' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleTestNotification}
                disabled={testingNotification}
              >
                <TestTube className="w-4 h-4 mr-1" />
                {testingNotification ? 'Sending...' : 'Test'}
              </Button>
            )}

            {permissionStatus !== 'granted' && (
              <Button
                size="sm"
                onClick={handleRequestPermission}
                disabled={!isNotificationSupported || permissionRequested}
              >
                <Bell className="w-4 h-4 mr-1" />
                Enable Notifications
              </Button>
            )}
          </div>
        </div>

        {!isNotificationSupported && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Your browser doesn't support notifications, or you're in a private/incognito window.
            </p>
          </div>
        )}

        {permissionStatus === 'denied' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Notifications are blocked. To enable them, click the lock icon in your browser's address bar and allow notifications for this site.
            </p>
          </div>
        )}
      </Card>

      {/* Notification Settings */}
      {permissionStatus === 'granted' && (
        <>
          {/* Master Toggle */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {preferences?.notifications_enabled ? (
                  <Bell className="w-6 h-6 text-blue-600" />
                ) : (
                  <BellOff className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <h3 className="font-medium text-gray-900">Enable Notifications</h3>
                  <p className="text-sm text-gray-600">
                    Receive smart notifications about visits and family updates
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences?.notifications_enabled || false}
                  onChange={(e) => handleToggle('notifications_enabled', e.target.checked)}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </Card>

          {preferences?.notifications_enabled && (
            <>
              {/* Notification Types */}
              <Card className="p-6">
                <h3 className="font-medium text-gray-900 mb-4">Notification Types</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Visit Reminders</h4>
                      <p className="text-sm text-gray-600">Get notified 1 hour before visits</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences?.visit_reminders || false}
                        onChange={(e) => handleToggle('visit_reminders', e.target.checked)}
                        disabled={saving}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Daily Summary</h4>
                      <p className="text-sm text-gray-600">Morning overview of your day's visits</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences?.daily_summary || false}
                        onChange={(e) => handleToggle('daily_summary', e.target.checked)}
                        disabled={saving}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Empty Slot Alerts</h4>
                      <p className="text-sm text-gray-600">Reminders when no visits are scheduled</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences?.empty_slot_alerts || false}
                        onChange={(e) => handleToggle('empty_slot_alerts', e.target.checked)}
                        disabled={saving}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Family Updates</h4>
                      <p className="text-sm text-gray-600">When family members share photos, notes, or updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences?.family_updates || false}
                        onChange={(e) => handleToggle('family_updates', e.target.checked)}
                        disabled={saving}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </Card>

              {/* Quiet Hours */}
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Moon className="w-5 h-5 text-purple-600" />
                  <h3 className="font-medium text-gray-900">Quiet Hours</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Set times when you don't want to receive notifications (except urgent visit reminders)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={preferences?.quiet_hours_start || '21:00'}
                      onChange={(e) => handleTimeChange('quiet_hours_start', e.target.value)}
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={preferences?.quiet_hours_end || '08:00'}
                      onChange={(e) => handleTimeChange('quiet_hours_end', e.target.value)}
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </Card>

              {/* Daily Limit */}
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Sun className="w-5 h-5 text-orange-600" />
                  <h3 className="font-medium text-gray-900">Daily Limit</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Maximum number of non-urgent notifications per day
                </p>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={preferences?.max_notifications_per_day || 3}
                    onChange={(e) => handleMaxNotificationsChange(parseInt(e.target.value))}
                    disabled={saving}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-900 min-w-[3rem]">
                    {preferences?.max_notifications_per_day || 3} per day
                  </span>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Saving preferences...
        </div>
      )}
    </div>
  );
};