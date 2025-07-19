-- =====================================================
-- TOUCHPOINTS PRODUCTION DATABASE MIGRATIONS
-- Run these in the Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/wuhafoazneztarvoxphj/sql/new
-- =====================================================
-- Run each migration in order (1-6)
-- =====================================================

-- =====================================================
-- MIGRATION 1: Core Tables (20250719010625_tight_block.sql)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Care circles table
CREATE TABLE IF NOT EXISTS care_circles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  facility_name TEXT,
  room_number TEXT,
  visiting_hours_start TIME,
  visiting_hours_end TIME,
  special_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Circle members table
CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('coordinator', 'visitor', 'view_only')) DEFAULT 'visitor',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES users(id),
  visit_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updates/messages table
CREATE TABLE IF NOT EXISTS updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- Care circles policies
CREATE POLICY "Users can view circles they belong to"
  ON care_circles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create care circles"
  ON care_circles
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by::text = auth.uid()::text);

CREATE POLICY "Coordinators can update their circles"
  ON care_circles
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text AND role = 'coordinator'
    )
  );

-- Circle members policies
CREATE POLICY "Users can view members of their circles"
  ON circle_members
  FOR SELECT
  TO authenticated
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members AS cm
      WHERE cm.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Coordinators can manage circle members"
  ON circle_members
  FOR ALL
  TO authenticated
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members AS cm
      WHERE cm.user_id::text = auth.uid()::text AND cm.role = 'coordinator'
    )
  );

CREATE POLICY "Users can join circles they're invited to"
  ON circle_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

-- Visits policies
CREATE POLICY "Users can view visits for their circles"
  ON visits
  FOR SELECT
  TO authenticated
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create visits for their circles"
  ON visits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
    AND visitor_id::text = auth.uid()::text
  );

CREATE POLICY "Users can update their own visits"
  ON visits
  FOR UPDATE
  TO authenticated
  USING (visitor_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own visits"
  ON visits
  FOR DELETE
  TO authenticated
  USING (visitor_id::text = auth.uid()::text);

-- Updates policies
CREATE POLICY "Users can view updates for their circles"
  ON updates
  FOR SELECT
  TO authenticated
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create updates for their circles"
  ON updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
    AND author_id::text = auth.uid()::text
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_circle_id ON visits(circle_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_updates_circle_id ON updates(circle_id);

-- Function to automatically create user profile from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- MIGRATION 2: Calendar Sync (20250719020000_calendar_sync.sql)
-- =====================================================

-- Calendar sync tracking table
CREATE TABLE IF NOT EXISTS calendar_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  calendar_provider TEXT CHECK (calendar_provider IN ('google', 'outlook', 'apple')) NOT NULL,
  external_event_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict')) DEFAULT 'synced',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure each visit can only be synced once per user per provider
  UNIQUE(visit_id, user_id, calendar_provider)
);

-- User calendar connections table (stores OAuth tokens securely)
CREATE TABLE IF NOT EXISTS user_calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  calendar_provider TEXT CHECK (calendar_provider IN ('google', 'outlook', 'apple')) NOT NULL,
  access_token_encrypted TEXT, -- Will be encrypted
  refresh_token_encrypted TEXT, -- Will be encrypted  
  token_expires_at TIMESTAMPTZ,
  scope TEXT, -- Permissions granted
  is_active BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  
  -- One connection per user per provider
  UNIQUE(user_id, calendar_provider)
);

-- Enable Row Level Security
ALTER TABLE calendar_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Calendar sync policies
CREATE POLICY "Users can view their own calendar syncs"
  ON calendar_sync
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage their own calendar syncs"
  ON calendar_sync
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Calendar connections policies  
CREATE POLICY "Users can view their own calendar connections"
  ON user_calendar_connections
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage their own calendar connections"
  ON user_calendar_connections
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_sync_visit_id ON calendar_sync(visit_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_user_id ON calendar_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_provider ON calendar_sync(calendar_provider);
CREATE INDEX IF NOT EXISTS idx_user_calendar_connections_user_id ON user_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendar_connections_provider ON user_calendar_connections(calendar_provider);

-- Function to clean up failed sync attempts older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_failed_syncs()
RETURNS void AS $$
BEGIN
  DELETE FROM calendar_sync 
  WHERE sync_status = 'failed' 
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to mark tokens as expired when they fail
CREATE OR REPLACE FUNCTION mark_token_expired(user_uuid UUID, provider TEXT)
RETURNS void AS $$
BEGIN
  UPDATE user_calendar_connections 
  SET is_active = FALSE, 
      token_expires_at = NOW()
  WHERE user_id = user_uuid 
    AND calendar_provider = provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION 3: Visit Patterns (20250719030000_visit_patterns.sql)
-- =====================================================

-- Visit patterns table - stores learned behaviors
CREATE TABLE IF NOT EXISTS visit_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Pattern identification
  pattern_type TEXT CHECK (pattern_type IN ('day_preference', 'time_preference', 'duration_preference', 'frequency_pattern')) NOT NULL,
  
  -- Day of week patterns (0 = Sunday, 6 = Saturday)
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  
  -- Time patterns (stored as time of day)
  preferred_start_time TIME,
  preferred_duration_minutes INTEGER,
  
  -- Pattern strength and learning
  occurrence_count INTEGER DEFAULT 1,
  total_opportunities INTEGER DEFAULT 1, -- How many times this pattern could have occurred
  consistency_score DECIMAL(3,2) DEFAULT 0.0, -- occurrence_count / total_opportunities
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')) DEFAULT 'low',
  
  -- Pattern metadata
  first_observed_at TIMESTAMPTZ DEFAULT NOW(),
  last_reinforced_at TIMESTAMPTZ DEFAULT NOW(),
  last_broken_at TIMESTAMPTZ, -- When pattern was broken (helps decay old patterns)
  
  -- Suggestion tracking
  suggestion_count INTEGER DEFAULT 0, -- How many times we've suggested based on this pattern
  acceptance_count INTEGER DEFAULT 0, -- How many times user accepted the suggestion
  rejection_count INTEGER DEFAULT 0, -- How many times user explicitly rejected
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure we don't duplicate patterns
  UNIQUE(circle_id, visitor_id, pattern_type, day_of_week, preferred_start_time)
);

-- Pattern suggestions table - tracks what we've suggested to avoid spam
CREATE TABLE IF NOT EXISTS pattern_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES visit_patterns(id) ON DELETE CASCADE,
  
  -- Suggestion details
  suggested_date DATE NOT NULL,
  suggested_start_time TIME NOT NULL,
  suggested_end_time TIME NOT NULL,
  suggestion_reason TEXT, -- Human readable explanation
  
  -- Response tracking
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')) DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  
  -- Auto-expire suggestions after 48 hours
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate suggestions for same day
  UNIQUE(circle_id, visitor_id, suggested_date)
);

-- Enable Row Level Security
ALTER TABLE visit_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_suggestions ENABLE ROW LEVEL SECURITY;

-- Visit patterns policies
CREATE POLICY "Users can view patterns for their circles"
  ON visit_patterns
  FOR SELECT
  TO authenticated
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "System can manage visit patterns"
  ON visit_patterns
  FOR ALL
  TO authenticated
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Pattern suggestions policies  
CREATE POLICY "Users can view suggestions for their circles"
  ON pattern_suggestions
  FOR SELECT
  TO authenticated
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can respond to their own suggestions"
  ON pattern_suggestions
  FOR UPDATE
  TO authenticated
  USING (visitor_id::text = auth.uid()::text);

CREATE POLICY "System can create suggestions"
  ON pattern_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visit_patterns_circle_visitor ON visit_patterns(circle_id, visitor_id);
CREATE INDEX IF NOT EXISTS idx_visit_patterns_day_time ON visit_patterns(day_of_week, preferred_start_time);
CREATE INDEX IF NOT EXISTS idx_visit_patterns_confidence ON visit_patterns(confidence_level, consistency_score);
CREATE INDEX IF NOT EXISTS idx_pattern_suggestions_visitor_date ON pattern_suggestions(visitor_id, suggested_date);
CREATE INDEX IF NOT EXISTS idx_pattern_suggestions_status_expires ON pattern_suggestions(status, expires_at);

-- Function to update pattern statistics
CREATE OR REPLACE FUNCTION update_pattern_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();
  
  -- Recalculate consistency score
  NEW.consistency_score = LEAST(1.0, NEW.occurrence_count::decimal / GREATEST(1, NEW.total_opportunities));
  
  -- Update confidence level based on consistency and sample size
  NEW.confidence_level = CASE
    WHEN NEW.occurrence_count >= 4 AND NEW.consistency_score >= 0.75 THEN 'high'
    WHEN NEW.occurrence_count >= 2 AND NEW.consistency_score >= 0.6 THEN 'medium'
    ELSE 'low'
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update pattern statistics
CREATE TRIGGER update_visit_patterns_stats
  BEFORE UPDATE ON visit_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_pattern_stats();

-- Function to clean up expired suggestions
CREATE OR REPLACE FUNCTION cleanup_expired_suggestions()
RETURNS void AS $$
BEGIN
  UPDATE pattern_suggestions 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to analyze visit history and extract patterns
CREATE OR REPLACE FUNCTION analyze_visit_patterns(circle_uuid UUID, analysis_days INTEGER DEFAULT 30)
RETURNS void AS $$
DECLARE
  visit_record RECORD;
  pattern_record RECORD;
BEGIN
  -- Analyze visits from the last analysis_days
  FOR visit_record IN 
    SELECT 
      visitor_id,
      EXTRACT(DOW FROM visit_date::date) as day_of_week,
      start_time,
      EXTRACT(EPOCH FROM (end_time::time - start_time::time))/60 as duration_minutes,
      visit_date
    FROM visits 
    WHERE circle_id = circle_uuid 
      AND status = 'completed'
      AND visit_date >= (CURRENT_DATE - analysis_days)
    ORDER BY visitor_id, visit_date
  LOOP
    -- Update or create day preference pattern
    INSERT INTO visit_patterns (
      circle_id, visitor_id, pattern_type, day_of_week, 
      occurrence_count, total_opportunities, last_reinforced_at
    ) VALUES (
      circle_uuid, visit_record.visitor_id, 'day_preference', visit_record.day_of_week::integer,
      1, 1, NOW()
    )
    ON CONFLICT (circle_id, visitor_id, pattern_type, day_of_week, preferred_start_time)
    DO UPDATE SET
      occurrence_count = visit_patterns.occurrence_count + 1,
      last_reinforced_at = NOW();
    
    -- Update or create time preference pattern  
    INSERT INTO visit_patterns (
      circle_id, visitor_id, pattern_type, preferred_start_time,
      occurrence_count, total_opportunities, last_reinforced_at
    ) VALUES (
      circle_uuid, visit_record.visitor_id, 'time_preference', visit_record.start_time,
      1, 1, NOW()
    )
    ON CONFLICT (circle_id, visitor_id, pattern_type, day_of_week, preferred_start_time)
    DO UPDATE SET
      occurrence_count = visit_patterns.occurrence_count + 1,
      last_reinforced_at = NOW();
  END LOOP;
  
  -- Update total opportunities for all patterns (how often they could have visited)
  UPDATE visit_patterns 
  SET total_opportunities = (
    SELECT COUNT(DISTINCT visit_date) 
    FROM visits 
    WHERE circle_id = circle_uuid 
      AND visit_date >= (CURRENT_DATE - analysis_days)
  )
  WHERE circle_id = circle_uuid;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION 4: Enhanced Visit Notes (20250719040000_enhanced_visit_notes.sql)
-- =====================================================

-- Add mood tracking and enhanced notes to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'difficult', 'concerning')),
ADD COLUMN IF NOT EXISTS mood_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enhanced_notes JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS visit_duration_actual INTEGER, -- Actual visit duration in minutes
ADD COLUMN IF NOT EXISTS private_notes TEXT; -- Notes visible only to the visitor who wrote them

-- Create table for visit attachments (photos, voice notes, etc.)
CREATE TABLE IF NOT EXISTS visit_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- File information
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'photo', 'voice', 'document'
  file_size INTEGER, -- Size in bytes
  mime_type TEXT,
  
  -- Storage information
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  thumbnail_path TEXT, -- For photos
  
  -- Metadata
  caption TEXT,
  alt_text TEXT, -- For accessibility
  duration_seconds INTEGER, -- For voice notes
  transcription TEXT, -- Auto-generated transcription for voice notes
  
  -- Privacy and sharing
  is_private BOOLEAN DEFAULT FALSE, -- Only visible to uploader
  is_archived BOOLEAN DEFAULT FALSE, -- Soft delete
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for mood history (optional detailed tracking)
CREATE TABLE IF NOT EXISTS mood_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
  recorder_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Mood information
  mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'difficult', 'concerning')) NOT NULL,
  mood_context TEXT, -- Optional context: "pain seemed better", "very alert today"
  
  -- Medical observations (optional)
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  alertness_level INTEGER CHECK (alertness_level BETWEEN 1 AND 5),
  pain_level INTEGER CHECK (pain_level BETWEEN 1 AND 5),
  
  -- Privacy
  is_shared BOOLEAN DEFAULT TRUE, -- Whether visible to other family members
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on new tables
ALTER TABLE visit_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_history ENABLE ROW LEVEL SECURITY;

-- Visit attachments policies
CREATE POLICY "Users can view attachments for their circles"
  ON visit_attachments
  FOR SELECT
  TO authenticated
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN circle_members cm ON cm.circle_id = v.circle_id
      WHERE cm.user_id::text = auth.uid()::text
    )
    AND (is_private = FALSE OR uploader_id::text = auth.uid()::text)
  );

CREATE POLICY "Users can upload attachments for their visits"
  ON visit_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN circle_members cm ON cm.circle_id = v.circle_id
      WHERE cm.user_id::text = auth.uid()::text
    )
    AND uploader_id::text = auth.uid()::text
  );

CREATE POLICY "Users can update their own attachments"
  ON visit_attachments
  FOR UPDATE
  TO authenticated
  USING (uploader_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own attachments"
  ON visit_attachments
  FOR DELETE
  TO authenticated
  USING (uploader_id::text = auth.uid()::text);

-- Mood history policies
CREATE POLICY "Users can view mood history for their circles"
  ON mood_history
  FOR SELECT
  TO authenticated
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
    AND (is_shared = TRUE OR recorder_id::text = auth.uid()::text)
  );

CREATE POLICY "Users can record mood for their circles"
  ON mood_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    circle_id IN (
      SELECT circle_id FROM circle_members 
      WHERE user_id::text = auth.uid()::text
    )
    AND recorder_id::text = auth.uid()::text
  );

CREATE POLICY "Users can update their own mood records"
  ON mood_history
  FOR UPDATE
  TO authenticated
  USING (recorder_id::text = auth.uid()::text);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visits_mood ON visits(mood, mood_updated_at);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit_id ON visit_attachments(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_type ON visit_attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_mood_history_visit_id ON mood_history(visit_id);
CREATE INDEX IF NOT EXISTS idx_mood_history_circle_id ON mood_history(circle_id, created_at);

-- Function to update visit mood and create mood history entry
CREATE OR REPLACE FUNCTION update_visit_mood(
  visit_uuid UUID,
  new_mood TEXT,
  recorder_uuid UUID,
  mood_context TEXT DEFAULT NULL,
  energy_level_val INTEGER DEFAULT NULL,
  alertness_level_val INTEGER DEFAULT NULL,
  pain_level_val INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  circle_uuid UUID;
BEGIN
  -- Get circle_id from visit
  SELECT circle_id INTO circle_uuid FROM visits WHERE id = visit_uuid;
  
  -- Update visit mood
  UPDATE visits 
  SET 
    mood = new_mood,
    mood_updated_at = NOW()
  WHERE id = visit_uuid;
  
  -- Create mood history entry
  INSERT INTO mood_history (
    visit_id, circle_id, recorder_id, mood, mood_context,
    energy_level, alertness_level, pain_level
  ) VALUES (
    visit_uuid, circle_uuid, recorder_uuid, new_mood, mood_context,
    energy_level_val, alertness_level_val, pain_level_val
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mood trends for a circle
CREATE OR REPLACE FUNCTION get_mood_trends(
  circle_uuid UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  mood_date DATE,
  mood_value TEXT,
  mood_count INTEGER,
  avg_energy DECIMAL,
  avg_alertness DECIMAL,
  avg_pain DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(mh.created_at) as mood_date,
    mh.mood as mood_value,
    COUNT(*)::integer as mood_count,
    AVG(mh.energy_level)::decimal as avg_energy,
    AVG(mh.alertness_level)::decimal as avg_alertness,
    AVG(mh.pain_level)::decimal as avg_pain
  FROM mood_history mh
  WHERE mh.circle_id = circle_uuid
    AND mh.created_at >= (CURRENT_DATE - days_back)
    AND mh.is_shared = TRUE
  GROUP BY DATE(mh.created_at), mh.mood
  ORDER BY mood_date DESC, mood_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update notes_updated_at when notes change
CREATE OR REPLACE FUNCTION update_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.notes IS DISTINCT FROM NEW.notes OR 
     OLD.enhanced_notes IS DISTINCT FROM NEW.enhanced_notes THEN
    NEW.notes_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update notes timestamp
DROP TRIGGER IF EXISTS update_visit_notes_timestamp ON visits;
CREATE TRIGGER update_visit_notes_timestamp
  BEFORE UPDATE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_timestamp();

-- Add additional columns for photo metadata
ALTER TABLE visit_attachments 
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS compression_quality INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS upload_status TEXT CHECK (upload_status IN ('uploading', 'completed', 'failed', 'queued')) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_file_size INTEGER,
ADD COLUMN IF NOT EXISTS compressed_file_size INTEGER;

-- Additional indexes for enhanced visit notes
CREATE INDEX IF NOT EXISTS idx_visit_attachments_photo_type ON visit_attachments(visit_id, file_type) WHERE file_type = 'photo';
CREATE INDEX IF NOT EXISTS idx_visit_attachments_upload_status ON visit_attachments(upload_status, created_at) WHERE upload_status != 'completed';

-- =====================================================
-- MIGRATION 5: Photo Storage (20250719050000_photo_storage.sql)
-- =====================================================

-- Note: The storage bucket creation is handled via Supabase Dashboard
-- This migration contains the storage policies and helper functions

-- Function to get photo URL with fallback
CREATE OR REPLACE FUNCTION get_photo_url(
  storage_path_param TEXT,
  thumbnail_path_param TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
  -- Return thumbnail URL if available, otherwise full photo URL
  IF thumbnail_path_param IS NOT NULL THEN
    RETURN thumbnail_path_param;
  ELSE
    RETURN storage_path_param;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned photos (photos without visit_attachments records)
CREATE OR REPLACE FUNCTION cleanup_orphaned_photos()
RETURNS void AS $$
BEGIN
  -- This function would interact with storage.objects
  -- but since we're creating buckets separately, we'll skip the actual deletion
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION 6: Notifications System (20250719060000_notifications_system.sql)
-- =====================================================

-- Create notification preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT false,
    visit_reminders BOOLEAN NOT NULL DEFAULT true,
    daily_summary BOOLEAN NOT NULL DEFAULT false,
    empty_slot_alerts BOOLEAN NOT NULL DEFAULT true,
    family_updates BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_start TIME NOT NULL DEFAULT '21:00',
    quiet_hours_end TIME NOT NULL DEFAULT '08:00',
    max_notifications_per_day INTEGER NOT NULL DEFAULT 3 CHECK (max_notifications_per_day >= 1 AND max_notifications_per_day <= 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create notification records table
CREATE TABLE notification_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('visit_reminder', 'daily_summary', 'empty_slot', 'family_update', 'visit_pattern')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ
);

-- Create indexes for notification_records
CREATE INDEX idx_notification_records_user_id ON notification_records(user_id);
CREATE INDEX idx_notification_records_sent_at ON notification_records(sent_at);
CREATE INDEX idx_notification_records_read_at ON notification_records(read_at);
CREATE INDEX idx_notification_records_type ON notification_records(type);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
    ON notification_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
    ON notification_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
    ON notification_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
    ON notification_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for notification_records
CREATE POLICY "Users can view their own notification records"
    ON notification_records
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification records"
    ON notification_records
    FOR INSERT
    WITH CHECK (true); -- Allow system to insert notifications

CREATE POLICY "Users can update their own notification records"
    ON notification_records
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification records"
    ON notification_records
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Function to clean up old notification records (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_records()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notification_records 
    WHERE sent_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON notification_records TO authenticated;

-- Add helpful comments
COMMENT ON TABLE notification_preferences IS 'User notification preferences and settings';
COMMENT ON TABLE notification_records IS 'History of all notifications sent to users';
COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'Start time for quiet hours (no notifications except urgent)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end IS 'End time for quiet hours';
COMMENT ON COLUMN notification_preferences.max_notifications_per_day IS 'Maximum non-urgent notifications per day (1-10)';
COMMENT ON COLUMN notification_records.type IS 'Type of notification: visit_reminder, daily_summary, empty_slot, family_update, visit_pattern';
COMMENT ON COLUMN notification_records.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON FUNCTION cleanup_old_notification_records() IS 'Removes notification records older than 90 days';

-- =====================================================
-- END OF MIGRATIONS
-- =====================================================