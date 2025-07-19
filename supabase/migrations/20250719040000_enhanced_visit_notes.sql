/*
  # Enhanced Visit Notes Migration
  
  Adds mood tracking and enhanced note capabilities to visits.
  Enables families to capture emotional and medical context during visits.
*/

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