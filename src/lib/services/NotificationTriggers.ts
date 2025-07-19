import { supabase } from '../supabase';
import { NotificationService, NotificationTrigger } from './NotificationService';
import type { Visit, CareCircle } from '../../types';

export interface TriggerContext {
  userId: string;
  circles: CareCircle[];
  recentVisits: Visit[];
  upcomingVisits: Visit[];
}

export class NotificationTriggers {
  
  /**
   * Analyze user patterns to determine active hours
   */
  private static async getUserActiveHours(userId: string): Promise<{ start: number; end: number }> {
    try {
      // Get user's recent visits to understand their typical schedule
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: visits } = await supabase
        .from('visits')
        .select('start_time, circles!inner(*)')
        .eq('circles.creator_id', userId)
        .or(`visitor_id.eq.${userId}`)
        .gte('visit_date', thirtyDaysAgo.toISOString().split('T')[0])
        .eq('status', 'completed');

      if (!visits || visits.length === 0) {
        return { start: 8, end: 20 }; // Default 8 AM to 8 PM
      }

      // Analyze visit start times to find active hours
      const hours = visits.map(visit => {
        const hour = parseInt(visit.start_time.split(':')[0]);
        return hour;
      });

      const minHour = Math.min(...hours);
      const maxHour = Math.max(...hours);

      // Add some buffer
      return {
        start: Math.max(7, minHour - 1),
        end: Math.min(22, maxHour + 2)
      };
    } catch (error) {
      console.error('Error analyzing user active hours:', error);
      return { start: 8, end: 20 };
    }
  }

  /**
   * Send morning planning notification
   */
  static async sendMorningPlanningNotification(userId: string): Promise<void> {
    const activeHours = await this.getUserActiveHours(userId);
    const now = new Date();
    const currentHour = now.getHours();

    // Only send if it's morning within active hours
    if (currentHour < activeHours.start || currentHour > activeHours.start + 2) {
      return;
    }

    try {
      // Get today's visits
      const today = new Date().toISOString().split('T')[0];
      
      const { data: todaysVisits } = await supabase
        .from('visits')
        .select(`
          *,
          circles!inner(patient_first_name, patient_last_name),
          visitor:users(full_name)
        `)
        .eq('visit_date', today)
        .eq('status', 'scheduled')
        .or(`visitor_id.eq.${userId},circles.creator_id.eq.${userId}`)
        .order('start_time');

      if (!todaysVisits || todaysVisits.length === 0) {
        // No visits today - suggest scheduling
        await NotificationService.sendNotification({
          type: 'empty_slot',
          title: 'Good morning! 🌅',
          body: 'No visits scheduled for today. Consider scheduling a visit with your loved one.',
          actionUrl: '/dashboard?action=schedule',
          userId,
        });
        return;
      }

      // Format visit list
      const visitList = todaysVisits.map(visit => {
        const time = visit.start_time.slice(0, 5); // HH:MM
        const patient = `${visit.circles.patient_first_name} ${visit.circles.patient_last_name}`;
        return `${time} - ${patient}`;
      }).join('\n');

      await NotificationService.sendNotification({
        type: 'daily_summary',
        title: `Good morning! You have ${todaysVisits.length} visit${todaysVisits.length > 1 ? 's' : ''} today`,
        body: `Today's schedule:\n${visitList}`,
        actionUrl: '/dashboard',
        userId,
      });

    } catch (error) {
      console.error('Error sending morning planning notification:', error);
    }
  }

  /**
   * Send visit reminder notifications
   */
  static async sendVisitReminders(): Promise<void> {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const today = now.toISOString().split('T')[0];
      const oneHourTime = oneHourFromNow.toTimeString().slice(0, 5);

      // Find visits starting in approximately 1 hour
      const { data: upcomingVisits } = await supabase
        .from('visits')
        .select(`
          *,
          circles!inner(patient_first_name, patient_last_name, facility_name),
          visitor:users(full_name)
        `)
        .eq('visit_date', today)
        .eq('status', 'scheduled')
        .gte('start_time', oneHourTime)
        .lt('start_time', new Date(oneHourFromNow.getTime() + 10 * 60 * 1000).toTimeString().slice(0, 5)); // 10 minute window

      if (!upcomingVisits) return;

      for (const visit of upcomingVisits) {
        const patient = `${visit.circles.patient_first_name} ${visit.circles.patient_last_name}`;
        const location = visit.circles.facility_name || 'care facility';
        
        await NotificationService.sendNotification({
          type: 'visit_reminder',
          title: `Visit reminder: ${patient}`,
          body: `Your visit is in 1 hour at ${location}. Time: ${visit.start_time}`,
          actionUrl: `/circles/${visit.circle_id}`,
          userId: visit.visitor_id!,
          circleId: visit.circle_id,
          visitId: visit.id,
        });
      }

    } catch (error) {
      console.error('Error sending visit reminders:', error);
    }
  }

  /**
   * Check for empty slots and send alerts
   */
  static async sendEmptySlotAlerts(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Find circles with no visits scheduled for tomorrow
      const { data: circlesWithNoVisits } = await supabase
        .from('care_circles')
        .select(`
          *,
          visits!left(id)
        `)
        .eq('is_active', true)
        .or(`visits.visit_date.neq.${tomorrowStr},visits.visit_date.is.null`);

      if (!circlesWithNoVisits) return;

      // Filter circles that truly have no visits tomorrow
      const emptyCircles = circlesWithNoVisits.filter(circle => 
        !circle.visits || circle.visits.length === 0
      );

      for (const circle of emptyCircles) {
        // Get circle creator and members
        const { data: members } = await supabase
          .from('circle_members')
          .select('user_id, users!inner(full_name)')
          .eq('circle_id', circle.id);

        if (!members) continue;

        // Send alert to creator and active members
        for (const member of members) {
          const patient = `${circle.patient_first_name} ${circle.patient_last_name}`;
          
          await NotificationService.sendNotification({
            type: 'empty_slot',
            title: 'Empty day tomorrow 📅',
            body: `No visits scheduled for ${patient} tomorrow. Consider scheduling a visit.`,
            actionUrl: `/circles/${circle.id}?action=schedule`,
            userId: member.user_id,
            circleId: circle.id,
          });
        }
      }

    } catch (error) {
      console.error('Error sending empty slot alerts:', error);
    }
  }

  /**
   * Send family update notifications
   */
  static async sendFamilyUpdateNotifications(
    circleId: string, 
    updateType: 'visit_completed' | 'photos_added' | 'voice_note_added' | 'mood_updated',
    triggerUserId: string,
    visitId?: string
  ): Promise<void> {
    try {
      // Get circle members (excluding the person who triggered the update)
      const { data: members } = await supabase
        .from('circle_members')
        .select(`
          user_id,
          users!inner(full_name),
          circles!inner(patient_first_name, patient_last_name)
        `)
        .eq('circle_id', circleId)
        .neq('user_id', triggerUserId);

      if (!members || members.length === 0) return;

      const { data: triggerUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', triggerUserId)
        .single();

      const triggerName = triggerUser?.full_name?.split(' ')[0] || 'Someone';
      const patient = `${members[0].circles.patient_first_name} ${members[0].circles.patient_last_name}`;

      let title: string;
      let body: string;
      let actionUrl: string;

      switch (updateType) {
        case 'visit_completed':
          title = `${triggerName} completed a visit`;
          body = `${triggerName} just finished visiting ${patient}. Check for updates!`;
          actionUrl = `/circles/${circleId}`;
          break;
        case 'photos_added':
          title = `New photos from ${triggerName}`;
          body = `${triggerName} shared photos from their visit with ${patient}`;
          actionUrl = visitId ? `/visits/${visitId}` : `/circles/${circleId}`;
          break;
        case 'voice_note_added':
          title = `Voice note from ${triggerName}`;
          body = `${triggerName} recorded a voice note about their visit with ${patient}`;
          actionUrl = visitId ? `/visits/${visitId}` : `/circles/${circleId}`;
          break;
        case 'mood_updated':
          title = `Visit update from ${triggerName}`;
          body = `${triggerName} updated the mood and notes for their visit with ${patient}`;
          actionUrl = visitId ? `/visits/${visitId}` : `/circles/${circleId}`;
          break;
        default:
          return;
      }

      for (const member of members) {
        await NotificationService.sendNotification({
          type: 'family_update',
          title,
          body,
          actionUrl,
          userId: member.user_id,
          circleId,
          visitId,
        });
      }

    } catch (error) {
      console.error('Error sending family update notifications:', error);
    }
  }

  /**
   * Send visit pattern suggestions
   */
  static async sendPatternSuggestions(userId: string): Promise<void> {
    try {
      // This would integrate with the existing visit pattern service
      // For now, just send a weekly suggestion to check patterns
      
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek !== 1) return; // Only send on Mondays

      const { data: circles } = await supabase
        .from('care_circles')
        .select('id, patient_first_name, patient_last_name')
        .eq('creator_id', userId)
        .eq('is_active', true);

      if (!circles || circles.length === 0) return;

      await NotificationService.sendNotification({
        type: 'visit_pattern',
        title: 'Weekly check-in 📊',
        body: 'Review your visit patterns and see if we can suggest better scheduling',
        actionUrl: '/dashboard?tab=patterns',
        userId,
      });

    } catch (error) {
      console.error('Error sending pattern suggestions:', error);
    }
  }

  /**
   * Main trigger function to be called periodically
   */
  static async runAllTriggers(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    try {
      // Visit reminders - check every 10 minutes
      if (currentMinute % 10 === 0) {
        await this.sendVisitReminders();
      }

      // Morning planning - once per hour between 7-9 AM
      if (currentHour >= 7 && currentHour <= 9 && currentMinute === 0) {
        // Get all users and send morning notifications
        const { data: users } = await supabase
          .from('users')
          .select('id');

        if (users) {
          for (const user of users) {
            await this.sendMorningPlanningNotification(user.id);
          }
        }
      }

      // Empty slot alerts - once per day at 6 PM
      if (currentHour === 18 && currentMinute === 0) {
        await this.sendEmptySlotAlerts();
      }

      // Pattern suggestions - Mondays at 10 AM
      if (now.getDay() === 1 && currentHour === 10 && currentMinute === 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id');

        if (users) {
          for (const user of users) {
            await this.sendPatternSuggestions(user.id);
          }
        }
      }

    } catch (error) {
      console.error('Error running notification triggers:', error);
    }
  }
}