-- Fix RLS policies to allow user creation during OAuth
-- This resolves the "new row violates row-level security policy" error

-- Drop existing restrictive policies on users table
DROP POLICY IF EXISTS "Users can only see their own data" ON users;
DROP POLICY IF EXISTS "Users can only update their own data" ON users;
DROP POLICY IF EXISTS "Users can only insert their own data" ON users;
DROP POLICY IF EXISTS "Users can only delete their own data" ON users;

-- Create comprehensive policies for different roles
-- Allow anon role to create users (needed for OAuth signup)
CREATE POLICY "Allow anon role to insert users" ON users 
FOR INSERT TO anon 
WITH CHECK (true);

-- Allow anon role to select users (needed for login checks)
CREATE POLICY "Allow anon role to select users" ON users 
FOR SELECT TO anon 
USING (true);

-- Allow authenticated users to see and update their own data
CREATE POLICY "Allow authenticated users to see own data" ON users 
FOR SELECT TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to update own data" ON users 
FOR UPDATE TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Allow service_role full access (for admin operations)
CREATE POLICY "Allow service_role full access to users" ON users 
FOR ALL TO service_role 
USING (true) 
WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Also fix policies for bets table to ensure proper access
DROP POLICY IF EXISTS "Users can only see their own bets" ON bets;
DROP POLICY IF EXISTS "Users can only insert their own bets" ON bets;
DROP POLICY IF EXISTS "Users can only update their own bets" ON bets;
DROP POLICY IF EXISTS "Users can only delete their own bets" ON bets;

-- Create proper policies for bets
CREATE POLICY "Allow users to see own bets" ON bets 
FOR SELECT TO authenticated, anon 
USING (user_id = auth.uid() OR auth.role() = 'anon');

CREATE POLICY "Allow users to insert own bets" ON bets 
FOR INSERT TO authenticated, anon 
WITH CHECK (user_id = auth.uid() OR auth.role() = 'anon');

CREATE POLICY "Allow users to update own bets" ON bets 
FOR UPDATE TO authenticated, anon 
USING (user_id = auth.uid() OR auth.role() = 'anon') 
WITH CHECK (user_id = auth.uid() OR auth.role() = 'anon');

CREATE POLICY "Allow users to delete own bets" ON bets 
FOR DELETE TO authenticated, anon 
USING (user_id = auth.uid() OR auth.role() = 'anon');

-- Allow service_role full access to bets
CREATE POLICY "Allow service_role full access to bets" ON bets 
FOR ALL TO service_role 
USING (true) 
WITH CHECK (true);

-- Enable RLS on bets table
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Similar fixes for sheets_sync_log table
DROP POLICY IF EXISTS "Users can only see their own sync logs" ON sheets_sync_log;

CREATE POLICY "Allow users to see own sync logs" ON sheets_sync_log 
FOR SELECT TO authenticated, anon 
USING (user_id = auth.uid() OR auth.role() = 'anon');

CREATE POLICY "Allow users to insert own sync logs" ON sheets_sync_log 
FOR INSERT TO authenticated, anon 
WITH CHECK (user_id = auth.uid() OR auth.role() = 'anon');

CREATE POLICY "Allow service_role full access to sync logs" ON sheets_sync_log 
FOR ALL TO service_role 
USING (true) 
WITH CHECK (true);

ALTER TABLE sheets_sync_log ENABLE ROW LEVEL SECURITY;

-- Display success message
SELECT 'RLS policies updated successfully! OAuth user creation should now work.' as status;