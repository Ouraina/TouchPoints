/*
  # Calendar Sync Table Migration
  
  Tracks which visits are synced to which external calendar events.
  Enables two-way sync between TouchPoints and external calendar providers.
*/

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