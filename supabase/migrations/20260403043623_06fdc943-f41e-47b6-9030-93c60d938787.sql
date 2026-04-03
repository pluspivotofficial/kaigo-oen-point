
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS current_status text,
  ADD COLUMN IF NOT EXISTS current_job text,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS work_location text;
