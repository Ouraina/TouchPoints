import { supabase } from '../supabase';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  visit_reminders: boolean;
  daily_summary: boolean;
  empty_slot_alerts: boolean;
  family_updates: boolean;
  quiet_hours_start: string; // HH:MM format
  quiet_hours_end: string; // HH:MM format
  max_notifications_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  circle_id?: string;
  visit_id?: string;
  type: 'visit_reminder' | 'daily_summary' | 'empty_slot' | 'family_update' | 'visit_pattern';
  title: string;
  body: string;
  action_url?: string;
  sent_at: string;
  read_at?: string;
  clicked_at?: string;
}

export interface NotificationTrigger {
  type: NotificationRecord['type'];
  title: string;
  body: string;
  actionUrl?: string;
  scheduleFor?: Date;
  userId: string;
  circleId?: string;
  visitId?: string;
}

export class NotificationService {
  private static readonly DEFAULT_PREFERENCES: Partial<NotificationPreferences> = {
    notifications_enabled: false,
    visit_reminders: true,
    daily_summary: false,
    empty_slot_alerts: true,
    family_updates: true,
    quiet_hours_start: '21:00',
    quiet_hours_end: '08:00',
    max_notifications_per_day: 3,
  };

  /**
   * Check if browser supports notifications
   */
  static isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current notification permission status
   */
  static getPermission(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Get user's notification preferences
   */
  static async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error is ok
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  /**
   * Update user's notification preferences
   */
  static async updatePreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.getPreferences(userId);
      
      if (existing) {
        // Update existing preferences
        const { error } = await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Create new preferences
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: userId,
            ...this.DEFAULT_PREFERENCES,
            ...preferences,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update preferences' 
      };
    }
  }

  /**
   * Check if notifications are enabled for user and type
   */
  static async areNotificationsEnabled(
    userId: string, 
    type: NotificationRecord['type']
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    
    if (!prefs || !prefs.notifications_enabled) {
      return false;
    }

    // Check specific notification type preferences
    switch (type) {
      case 'visit_reminder':
        return prefs.visit_reminders;
      case 'daily_summary':
        return prefs.daily_summary;
      case 'empty_slot':
        return prefs.empty_slot_alerts;
      case 'family_update':
        return prefs.family_updates;
      default:
        return true;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  static async isQuietTime(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    if (!prefs) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

    const startTime = parseInt(prefs.quiet_hours_start.replace(':', ''));
    const endTime = parseInt(prefs.quiet_hours_end.replace(':', ''));

    // Handle overnight quiet hours (e.g., 21:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Check daily notification limit
   */
  static async hasReachedDailyLimit(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    if (!prefs) return true;

    const today = new Date().toISOString().split('T')[0];
    
    const { count, error } = await supabase
      .from('notification_records')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('sent_at', `${today}T00:00:00Z`)
      .lt('sent_at', `${today}T23:59:59Z`);

    if (error) {
      console.error('Error checking daily notification limit:', error);
      return true; // Err on the side of caution
    }

    return (count || 0) >= prefs.max_notifications_per_day;
  }

  /**
   * Send browser notification
   */
  static async sendBrowserNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<boolean> {
    if (!this.isSupported() || this.getPermission() !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/icon-192x192.svg',
        tag: 'touchpoints',
        renotify: false,
        ...options,
      });

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      return true;
    } catch (error) {
      console.error('Error sending browser notification:', error);
      return false;
    }
  }

  /**
   * Send notification with smart filtering
   */
  static async sendNotification(trigger: NotificationTrigger): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if notifications are enabled for this type
      const enabled = await this.areNotificationsEnabled(trigger.userId, trigger.type);
      if (!enabled) {
        return { success: false, error: 'Notifications disabled for this type' };
      }

      // Check quiet hours
      const isQuiet = await this.isQuietTime(trigger.userId);
      if (isQuiet && trigger.type !== 'visit_reminder') {
        // Visit reminders can interrupt quiet hours, others cannot
        return { success: false, error: 'Quiet hours active' };
      }

      // Check daily limit
      const limitReached = await this.hasReachedDailyLimit(trigger.userId);
      if (limitReached && trigger.type !== 'visit_reminder') {
        // Visit reminders bypass daily limit
        return { success: false, error: 'Daily notification limit reached' };
      }

      // Send browser notification
      const browserSuccess = await this.sendBrowserNotification(trigger.title, {
        body: trigger.body,
        data: {
          actionUrl: trigger.actionUrl,
          type: trigger.type,
          userId: trigger.userId,
          circleId: trigger.circleId,
          visitId: trigger.visitId,
        },
      });

      // Record notification in database
      const record: Partial<NotificationRecord> = {
        user_id: trigger.userId,
        circle_id: trigger.circleId,
        visit_id: trigger.visitId,
        type: trigger.type,
        title: trigger.title,
        body: trigger.body,
        action_url: trigger.actionUrl,
        sent_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from('notification_records')
        .insert(record);

      if (dbError) {
        console.error('Error recording notification:', dbError);
      }

      return { success: browserSuccess };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send notification' 
      };
    }
  }

  /**
   * Get user's notification history
   */
  static async getNotificationHistory(
    userId: string, 
    limit: number = 50
  ): Promise<NotificationRecord[]> {
    try {
      const { data, error } = await supabase
        .from('notification_records')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notification_records')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark notification as clicked
   */
  static async markAsClicked(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notification_records')
        .update({ clicked_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as clicked:', error);
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notification_records')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Test notification (for settings page)
   */
  static async sendTestNotification(userId: string): Promise<{ success: boolean; error?: string }> {
    return this.sendNotification({
      type: 'family_update',
      title: 'TouchPoints Test',
      body: 'This is a test notification. Your notifications are working!',
      userId,
    });
  }
}