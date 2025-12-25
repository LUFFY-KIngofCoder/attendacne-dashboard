-- ==========================================
-- Add event_name column to holidays table
-- Run this if you already have the holidays table
-- ==========================================

-- Add event_name column if it doesn't exist
ALTER TABLE public.holidays
  ADD COLUMN IF NOT EXISTS event_name text;

-- Add comment
COMMENT ON COLUMN public.holidays.event_name IS 'Event/deadline name shown as blue tag for all employees';

