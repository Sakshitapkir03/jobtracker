-- Remove auth dependency: disable RLS and drop FK constraints on user_id
-- This converts the app to single-user mode (no Supabase auth required)

-- 1. Disable RLS on all tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 2. Drop RLS policies
DROP POLICY IF EXISTS "users_own_companies"      ON companies;
DROP POLICY IF EXISTS "users_own_applications"   ON applications;
DROP POLICY IF EXISTS "users_own_notifications"  ON notifications;

-- 3. Drop foreign key constraints linking user_id to auth.users
ALTER TABLE companies     DROP CONSTRAINT IF EXISTS companies_user_id_fkey;
ALTER TABLE applications  DROP CONSTRAINT IF EXISTS applications_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- 4. Change user_id from uuid to text so any string works
ALTER TABLE companies     ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE applications  ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE notifications ALTER COLUMN user_id TYPE text USING user_id::text;
