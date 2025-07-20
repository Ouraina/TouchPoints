/*
  # Subscription Support Migration
  
  Adds Stripe subscription fields to the users table to track
  subscription status, plan, and billing information.
*/

-- Add subscription fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;

-- Create index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Add RLS policy for subscription data
CREATE POLICY "Users can view their own subscription data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own subscription data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Create subscription plans table for reference
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stripe_price_id TEXT UNIQUE NOT NULL,
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, price, stripe_price_id, features) VALUES
  ('solo', 'Solo Caregiver', 12.99, 'price_solo_monthly', '["1 care circle", "Basic visit scheduling", "Photo sharing", "Visit notes", "Mobile app access", "Email support"]'),
  ('family', 'Family Plan', 29.99, 'price_family_monthly', '["Unlimited family members", "Smart AI suggestions", "Real-time notifications", "Advanced calendar views", "Voice notes with transcription", "Family insights dashboard", "Emergency alert system", "Priority support"]'),
  ('pro', 'Pro Care Team', 49.99, 'price_pro_monthly', '["Everything in Family", "Professional caregiver access", "Advanced analytics & reports", "API integrations", "Custom care protocols", "24/7 phone support", "White-label options", "HIPAA compliance tools"]')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view subscription plans
CREATE POLICY "All users can view subscription plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE); 