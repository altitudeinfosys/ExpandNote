-- ============================================================================
-- Fix RLS Policies for user_settings table
-- Run this SQL in your Supabase Dashboard > SQL Editor
-- ============================================================================

-- First, check if policies exist
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'user_settings';

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;

-- Create RLS policies for user_settings
CREATE POLICY "Users can view own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Verify policies were created
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'user_settings';
