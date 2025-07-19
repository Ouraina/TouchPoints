import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Users, AlertCircle, TrendingUp, X, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { NotificationService, type NotificationRecord } from '../../lib/services/NotificationService';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const getNotificationIcon = (type: NotificationRecord['type']) => {
  switch (type) {
    case 'visit_reminder':
      return <Calendar className="w-5 h-5 text-blue-600" />;
    case 'daily_summary':
      return <Calendar className="w-5 h-5 text-green-600" />;
    case 'empty_slot':
      return <AlertCircle className="w-5 h-5 text-orange-600" />;
    case 'family_update':
      return <Users className="w-5 h-5 text-purple-600" />;
    case 'visit_pattern':
      return <TrendingUp className="w-5 h-5 text-indigo-600" />;
    default:
      return <Bell className="w-5 h-5 text-gray-600" />;
  }
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen && user) {
      loadNotifications();
    }
  }, [isOpen, user]);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [notificationHistory, unread] = await Promise.all([
        NotificationService.getNotificationHistory(user.id, 50),
        NotificationService.getUnreadCount(user.id)
      ]);

      setNotifications(notificationHistory);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: NotificationRecord) => {
    // Mark as read and clicked
    if (!notification.read_at) {
      await NotificationService.markAsRead(notification.id);
    }
    await NotificationService.markAsClicked(notification.id);

    // Navigate to action URL if provided
    if (notification.action_url) {
      onClose();
      navigate(notification.action_url);
    }

    // Update local state
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id 
          ? { ...n, read_at: new Date().toISOString(), clicked_at: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read_at);
      await Promise.all(
        unreadNotifications.map(n => NotificationService.markAsRead(n.id))
      );

      setNotifications(prev => 
        prev.map(n => ({
          ...n,
          read_at: n.read_at || new Date().toISOString()
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.sent_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString();
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {} as Record<string, NotificationRecord[]>);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
    >
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {unreadCount > 0 && (
              <span>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</span>
            )}
            {unreadCount === 0 && notifications.length > 0 && (
              <span>All caught up!</span>
            )}
            {notifications.length === 0 && !loading && (
              <span>No notifications yet</span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <div className="max-h-96 overflow-y-auto space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No notifications yet</p>
              <p className="text-gray-400 text-xs mt-1">
                You'll see visit reminders and family updates here
              </p>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
              <div key={date}>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {date}
                </h3>
                <div className="space-y-2">
                  {dayNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`
                        flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${notification.read_at 
                          ? 'bg-white border-gray-200 hover:bg-gray-50' 
                          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        }
                        ${notification.action_url ? 'hover:shadow-sm' : ''}
                      `}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-sm font-medium ${
                            notification.read_at ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-1 ml-2">
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatRelativeTime(notification.sent_at)}
                            </span>
                            {notification.action_url && (
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-sm mt-1 ${
                          notification.read_at ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {notification.body}
                        </p>

                        {/* Unread indicator */}
                        {!notification.read_at && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Showing last 50 notifications
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Notification bell icon with badge for header
interface NotificationBellProps {
  onClick: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onClick,
  className = ''
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      
      // Poll for unread count every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const count = await NotificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors ${className}`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};