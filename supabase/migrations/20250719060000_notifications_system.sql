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
    clicked_at TIMESTAMPTZ,
    
    -- Indexes for performance
    INDEX idx_notification_records_user_id (user_id),
    INDEX idx_notification_records_sent_at (sent_at),
    INDEX idx_notification_records_read_at (read_at),
    INDEX idx_notification_records_type (type)
);

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