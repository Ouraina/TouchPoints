import { useState, useEffect, useCallback } from 'react';
import { GoogleCalendarService } from '../services/calendar/GoogleCalendarService';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import type { Visit, CareCircle } from '../types';

interface CalendarSyncState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

interface SyncResult {
  success: boolean;
  error?: string;
}

export const useCalendarSync = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CalendarSyncState>({
    isConnected: false,
    isLoading: false,
    error: null,
    lastSync: null
  });

  const calendarService = new GoogleCalendarService();

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const connected = await calendarService.hasActiveConnection(user.id);
      setState(prev => ({
        ...prev,
        isConnected: connected,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check connection'
      }));
    }
  }, [user]);

  // Sync visit to calendar when created
  const syncVisitCreate = useCallback(async (visit: Visit, circle: CareCircle): Promise<SyncResult> => {
    if (!user || !state.isConnected) {
      return { success: true }; // Skip sync if not connected - don't fail core functionality
    }

    try {
      const result = await calendarService.createVisitEvent(visit, circle, user.id);
      
      if (result.success) {
        setState(prev => ({ ...prev, lastSync: new Date(), error: null }));
      } else {
        // Don't fail the visit creation, just log the calendar sync failure
        console.warn('Calendar sync failed:', result.error);
        setState(prev => ({ ...prev, error: result.error || null }));
      }
      
      return result;
    } catch (error) {
      console.warn('Calendar sync error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Calendar sync failed'
      }));
      return { success: false, error: error instanceof Error ? error.message : 'Sync failed' };
    }
  }, [user, state.isConnected]);

  // Sync visit to calendar when updated
  const syncVisitUpdate = useCallback(async (visit: Visit, circle: CareCircle): Promise<SyncResult> => {
    if (!user || !state.isConnected) {
      return { success: true }; // Skip sync if not connected
    }

    try {
      const result = await calendarService.updateVisitEvent(visit, circle, user.id);
      
      if (result.success) {
        setState(prev => ({ ...prev, lastSync: new Date(), error: null }));
      } else {
        console.warn('Calendar update failed:', result.error);
        setState(prev => ({ ...prev, error: result.error || null }));
      }
      
      return result;
    } catch (error) {
      console.warn('Calendar update error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Calendar update failed'
      }));
      return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
    }
  }, [user, state.isConnected]);

  // Sync visit deletion to calendar
  const syncVisitDelete = useCallback(async (visitId: string): Promise<SyncResult> => {
    if (!user || !state.isConnected) {
      return { success: true }; // Skip sync if not connected
    }

    try {
      const result = await calendarService.deleteVisitEvent(visitId, user.id);
      
      if (result.success) {
        setState(prev => ({ ...prev, lastSync: new Date(), error: null }));
      } else {
        console.warn('Calendar deletion failed:', result.error);
        setState(prev => ({ ...prev, error: result.error || null }));
      }
      
      return result;
    } catch (error) {
      console.warn('Calendar deletion error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Calendar deletion failed'
      }));
      return { success: false, error: error instanceof Error ? error.message : 'Deletion failed' };
    }
  }, [user, state.isConnected]);

  // Get sync status for a specific visit
  const getVisitSyncStatus = useCallback(async (visitId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('calendar_sync')
        .select('*')
        .eq('visit_id', visitId)
        .eq('user_id', user.id)
        .eq('calendar_provider', 'google')
        .single();

      if (error || !data) return null;

      return {
        synced: data.sync_status === 'synced',
        lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : null,
        status: data.sync_status,
        error: data.error_message
      };
    } catch (error) {
      console.error('Error checking sync status:', error);
      return null;
    }
  }, [user]);

  // Clear sync error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize connection check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    ...state,
    checkConnection,
    syncVisitCreate,
    syncVisitUpdate,
    syncVisitDelete,
    getVisitSyncStatus,
    clearError
  };
};