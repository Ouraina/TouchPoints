// Browser-compatible Google Calendar service using REST API
import { supabase } from '../../lib/supabase';
import type { Visit, CareCircle } from '../../types';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface CalendarConnection {
  id: string;
  user_id: string;
  calendar_provider: 'google';
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
}

export interface CalendarSyncResult {
  success: boolean;
  error?: string;
  eventId?: string;
}

export class GoogleCalendarService {
  private static readonly GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  private static readonly GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  private static readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
  private static readonly OAUTH_BASE = 'https://oauth2.googleapis.com/token';
  private static readonly REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

  /**
   * Check if Google Calendar is configured
   */
  static isConfigured(): boolean {
    return !!(this.GOOGLE_CLIENT_ID && this.GOOGLE_CLIENT_SECRET);
  }

  /**
   * Generate OAuth URL for Google Calendar authorization
   */
  static getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const params = new URLSearchParams({
      client_id: this.GOOGLE_CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      scope: scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  } | null> {
    try {
      const response = await fetch(this.OAUTH_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.GOOGLE_CLIENT_ID,
          client_secret: this.GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Token exchange error:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  } | null> {
    try {
      const response = await fetch(this.OAUTH_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.GOOGLE_CLIENT_ID,
          client_secret: this.GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Make authenticated request to Google Calendar API
   */
  static async makeAuthenticatedRequest(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<Response> {
    return fetch(`${this.CALENDAR_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  /**
   * Handle authorization callback and store connection
   */
  static async handleAuthCallback(code: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const tokens = await this.exchangeCodeForTokens(code);
      
      if (!tokens || !tokens.access_token || !tokens.refresh_token) {
        return { success: false, error: 'Failed to obtain required tokens' };
      }

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Store connection in database
      const { error } = await supabase
        .from('user_calendar_connections')
        .insert({
          user_id: userId,
          calendar_provider: 'google',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
        });

      if (error) {
        console.error('Database error storing connection:', error);
        return { success: false, error: 'Failed to store calendar connection' };
      }

      return { success: true };
    } catch (error) {
      console.error('Google Calendar auth error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      // Get connection from database
      const { data: connection, error } = await supabase
        .from('user_calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('calendar_provider', 'google')
        .single();

      if (error || !connection) {
        return null;
      }

      // Check if token is still valid
      const now = new Date();
      const expiresAt = new Date(connection.expires_at);

      if (now < expiresAt) {
        return connection.access_token;
      }

      // Token expired, refresh it
      const newTokens = await this.refreshAccessToken(connection.refresh_token);
      if (!newTokens) {
        return null;
      }

      // Update database with new token
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
      
      const { error: updateError } = await supabase
        .from('user_calendar_connections')
        .update({
          access_token: newTokens.access_token,
          expires_at: newExpiresAt,
        })
        .eq('id', connection.id);

      if (updateError) {
        console.error('Error updating token:', updateError);
        return null;
      }

      return newTokens.access_token;
    } catch (error) {
      console.error('Error getting valid access token:', error);
      return null;
    }
  }

  /**
   * Create calendar event for visit
   */
  static async createEventForVisit(
    visit: Visit,
    circle: CareCircle,
    userId: string
  ): Promise<CalendarSyncResult> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      if (!accessToken) {
        return { success: false, error: 'No valid Google Calendar connection' };
      }

      const event: CalendarEvent = {
        summary: `Visit with ${circle.patient_first_name} ${circle.patient_last_name}`,
        description: visit.notes || `Scheduled visit at ${circle.facility_name || 'care facility'}`,
        location: circle.facility_name ? 
          `${circle.facility_name}${circle.room_number ? `, Room ${circle.room_number}` : ''}` : 
          undefined,
        start: {
          dateTime: `${visit.visit_date}T${visit.start_time}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: `${visit.visit_date}T${visit.end_time}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'email', minutes: 1440 }, // 24 hours
          ],
        },
      };

      const response = await this.makeAuthenticatedRequest(
        '/calendars/primary/events',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
      }

      const createdEvent = await response.json();

      // Store sync record
      await supabase
        .from('calendar_sync')
        .insert({
          visit_id: visit.id,
          user_id: userId,
          calendar_provider: 'google',
          external_event_id: createdEvent.id,
          sync_status: 'synced',
        });

      return { success: true, eventId: createdEvent.id };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create calendar event' 
      };
    }
  }

  /**
   * Update calendar event for visit
   */
  static async updateEventForVisit(
    visit: Visit,
    circle: CareCircle,
    userId: string,
    eventId: string
  ): Promise<CalendarSyncResult> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      if (!accessToken) {
        return { success: false, error: 'No valid Google Calendar connection' };
      }

      const event: CalendarEvent = {
        summary: `Visit with ${circle.patient_first_name} ${circle.patient_last_name}`,
        description: visit.notes || `Scheduled visit at ${circle.facility_name || 'care facility'}`,
        location: circle.facility_name ? 
          `${circle.facility_name}${circle.room_number ? `, Room ${circle.room_number}` : ''}` : 
          undefined,
        start: {
          dateTime: `${visit.visit_date}T${visit.start_time}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: `${visit.visit_date}T${visit.end_time}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const response = await this.makeAuthenticatedRequest(
        `/calendars/primary/events/${eventId}`,
        accessToken,
        {
          method: 'PUT',
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.statusText}`);
      }

      return { success: true, eventId };
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update calendar event' 
      };
    }
  }

  /**
   * Delete calendar event
   */
  static async deleteEvent(userId: string, eventId: string): Promise<CalendarSyncResult> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      if (!accessToken) {
        return { success: false, error: 'No valid Google Calendar connection' };
      }

      const response = await this.makeAuthenticatedRequest(
        `/calendars/primary/events/${eventId}`,
        accessToken,
        { method: 'DELETE' }
      );

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete event: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete calendar event' 
      };
    }
  }

  /**
   * Check if user has Google Calendar connected
   */
  static async isConnected(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_calendar_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('calendar_provider', 'google')
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect Google Calendar
   */
  static async disconnect(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_calendar_connections')
        .delete()
        .eq('user_id', userId)
        .eq('calendar_provider', 'google');

      if (error) {
        return { success: false, error: 'Failed to disconnect calendar' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to disconnect calendar' 
      };
    }
  }
}