/*
  # Visit Patterns Analysis Migration
  
  Stores learned patterns from family visit behaviors to enable intelligent suggestions.
  Focuses on helpfulness without being intrusive.
*/

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