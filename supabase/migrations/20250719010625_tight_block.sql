/*
  # TouchPoints Database Schema

  1. New Tables
    - `users` - User profiles (extends auth.users)
    - `care_circles` - Patient care coordination groups
    - `circle_members` - Users belonging to care circles
    - `visits` - Scheduled visits to patients
    - `updates` - Communication updates within circles

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Prevent unauthorized access to other families' data
    - Allow circle members to view and manage circle data
*/

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