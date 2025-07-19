export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  created_at: string
}

export interface CareCircle {
  id: string
  patient_first_name: string
  patient_last_name: string
  facility_name?: string
  room_number?: string
  visiting_hours_start?: string
  visiting_hours_end?: string
  special_notes?: string
  created_by?: string
  created_at: string
  is_active: boolean
}

export interface CircleMember {
  id: string
  circle_id: string
  user_id: string
  role: 'coordinator' | 'visitor' | 'view_only'
  joined_at: string
  user?: User
}

export interface Visit {
  id: string
  circle_id: string
  visitor_id?: string
  visit_date: string
  start_time: string
  end_time: string
  notes?: string
  mood?: 'great' | 'good' | 'okay' | 'difficult' | 'concerning'
  mood_updated_at?: string
  enhanced_notes?: Record<string, any>
  notes_updated_at?: string
  visit_duration_actual?: number
  private_notes?: string
  has_voice_note?: boolean
  status: 'scheduled' | 'completed' | 'cancelled'
  created_at: string
  visitor?: User
}

export interface Update {
  id: string
  circle_id: string
  author_id?: string
  message: string
  created_at: string
  author?: User
}

export interface NotificationPreferences {
  id: string
  user_id: string
  notifications_enabled: boolean
  visit_reminders: boolean
  daily_summary: boolean
  empty_slot_alerts: boolean
  family_updates: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  max_notifications_per_day: number
  created_at: string
  updated_at: string
}

export interface NotificationRecord {
  id: string
  user_id: string
  circle_id?: string
  visit_id?: string
  type: 'visit_reminder' | 'daily_summary' | 'empty_slot' | 'family_update' | 'visit_pattern'
  title: string
  body: string
  action_url?: string
  sent_at: string
  read_at?: string
  clicked_at?: string
}

export interface CalendarSync {
  id: string
  visit_id: string
  user_id: string
  calendar_provider: 'google' | 'outlook' | 'apple'
  external_event_id: string
  last_synced_at: string
  sync_status: 'synced' | 'pending' | 'failed' | 'conflict'
  error_message?: string
  created_at: string
}

export interface UserCalendarConnection {
  id: string
  user_id: string
  calendar_provider: 'google' | 'outlook' | 'apple'
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expires_at?: string
  scope: string
  is_active: boolean
  connected_at: string
  last_sync_at?: string
}

export interface VisitPattern {
  id: string
  circle_id: string
  visitor_id: string
  pattern_type: 'day_preference' | 'time_preference' | 'duration_preference' | 'frequency_pattern'
  day_of_week?: number
  preferred_start_time?: string
  preferred_duration_minutes?: number
  occurrence_count: number
  total_opportunities: number
  consistency_score: number
  confidence_level: 'low' | 'medium' | 'high'
  suggestion_count: number
  acceptance_count: number
  rejection_count: number
  created_at: string
  visitor?: User
}

export interface PatternSuggestion {
  id: string
  circle_id: string
  visitor_id: string
  pattern_id: string
  suggested_date: string
  suggested_start_time: string
  suggested_end_time: string
  suggestion_reason: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  responded_at?: string
  expires_at: string
  created_at: string
}

export interface VisitAttachment {
  id: string
  visit_id: string
  uploader_id: string
  file_name: string
  file_type: 'photo' | 'voice' | 'document'
  file_size?: number
  mime_type?: string
  storage_path: string
  thumbnail_path?: string
  caption?: string
  alt_text?: string
  duration_seconds?: number
  transcription?: string
  is_private: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  uploader?: User
}

export interface MoodHistory {
  id: string
  visit_id: string
  circle_id: string
  recorder_id: string
  mood: 'great' | 'good' | 'okay' | 'difficult' | 'concerning'
  mood_context?: string
  energy_level?: number
  alertness_level?: number
  pain_level?: number
  is_shared: boolean
  created_at: string
  recorder?: User
}

export interface MoodTrend {
  mood_date: string
  mood_value: 'great' | 'good' | 'okay' | 'difficult' | 'concerning'
  mood_count: number
  avg_energy?: number
  avg_alertness?: number
  avg_pain?: number
}