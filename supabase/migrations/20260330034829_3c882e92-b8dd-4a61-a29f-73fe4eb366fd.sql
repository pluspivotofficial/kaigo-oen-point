ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS dispatch_company text,
  ADD COLUMN IF NOT EXISTS hourly_rate integer,
  ADD COLUMN IF NOT EXISTS weekly_days text,
  ADD COLUMN IF NOT EXISTS preferred_shift text;