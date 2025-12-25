-- ==========================================
-- Add Events Table (Separate from Holidays)
-- Run this in Supabase SQL Editor
-- ==========================================

-- Create events table (multiple events per date)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Index for date lookups
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events (date);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can manage, all authenticated users can read
CREATE POLICY events_select_auth
  ON public.events
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY events_admin_full
  ON public.events
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

