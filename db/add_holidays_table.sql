-- ==========================================
-- Add Holidays Table
-- Run this in Supabase SQL Editor
-- ==========================================

-- Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  is_holiday boolean NOT NULL DEFAULT true,
  name text,
  description text,
  event_name text,  -- For events/deadlines (shown as blue tags)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Index for date lookups
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays (date);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can manage, all authenticated users can read
CREATE POLICY holidays_select_auth
  ON public.holidays
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY holidays_admin_full
  ON public.holidays
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_holidays
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Insert default weekends (Saturday = 6, Sunday = 0)
-- This will mark all Saturdays and Sundays as holidays by default
-- Admin can override specific dates later
DO $$
DECLARE
  start_date date := '2024-01-01';
  end_date date := '2025-12-31';
  curr_date date := start_date;
  day_of_week integer;
BEGIN
  WHILE curr_date <= end_date LOOP
    day_of_week := EXTRACT(DOW FROM curr_date);
    
    -- Saturday (6) or Sunday (0) are holidays by default
    IF day_of_week = 0 OR day_of_week = 6 THEN
      INSERT INTO public.holidays (date, is_holiday, name)
      VALUES (
        curr_date,
        true,
        CASE 
          WHEN day_of_week = 0 THEN 'Sunday'
          WHEN day_of_week = 6 THEN 'Saturday'
        END
      )
      ON CONFLICT (date) DO NOTHING;
    END IF;
    
    curr_date := curr_date + INTERVAL '1 day';
  END LOOP;
END $$;

