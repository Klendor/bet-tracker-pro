-- Supabase Database Schema for Bet Tracker Pro
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with Google OAuth and Sheets integration
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT,
    google_id TEXT UNIQUE,
    google_access_token TEXT,
    google_refresh_token TEXT,
    sheets_connected BOOLEAN DEFAULT false,
    spreadsheet_id TEXT,
    spreadsheet_url TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'proplus')),
    usage_count INTEGER DEFAULT 0,
    usage_reset_date TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bets table with enhanced tracking
CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    teams TEXT,
    sport TEXT,
    league TEXT,
    bet_type TEXT,
    selection TEXT,
    odds TEXT,
    stake TEXT,
    potential_return TEXT,
    actual_return TEXT,
    profit_loss TEXT,
    roi_percentage TEXT,
    bookmaker TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void', 'cancelled')),
    date DATE,
    settlement_date DATE,
    confidence TEXT CHECK (confidence IN ('High', 'Medium', 'Low')),
    notes TEXT,
    image_hash TEXT,
    synced_to_sheets BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Sheets sync log
CREATE TABLE IF NOT EXISTS sheets_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bet_id UUID REFERENCES bets(id) ON DELETE CASCADE,
    sync_status TEXT CHECK (sync_status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_processed_at ON bets(processed_at);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_sheets_sync_log_user_id ON sheets_sync_log(user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment user usage count
CREATE OR REPLACE FUNCTION increment_usage(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_usage INTEGER;
BEGIN
    UPDATE users 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = user_id
    RETURNING usage_count INTO current_usage;
    
    RETURN current_usage;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheets_sync_log ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid()::uuid);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid()::uuid);

-- Bets policies
CREATE POLICY "Users can view own bets" ON bets
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can insert own bets" ON bets
    FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update own bets" ON bets
    FOR UPDATE USING (user_id = auth.uid()::uuid);

-- Sheets sync log policies
CREATE POLICY "Users can view own sync logs" ON sheets_sync_log
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can insert own sync logs" ON sheets_sync_log
    FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- Insert demo user for testing
INSERT INTO users (
    email, 
    password_hash, 
    name, 
    plan, 
    usage_count, 
    usage_reset_date
) VALUES (
    'demo@bettracker.com',
    '$2a$10$example.hash.here', -- Replace with actual bcrypt hash
    'Demo User',
    'free',
    5,
    (NOW() + INTERVAL '1 month')::date
) ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;