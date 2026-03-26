
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS care_experience text,
  ADD COLUMN IF NOT EXISTS care_qualifications text;
