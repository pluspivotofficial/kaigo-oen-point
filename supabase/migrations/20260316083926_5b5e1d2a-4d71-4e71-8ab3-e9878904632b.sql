
-- Add prefecture to profiles
ALTER TABLE public.profiles ADD COLUMN prefecture text;

-- Add facility_name to shifts
ALTER TABLE public.shifts ADD COLUMN facility_name text;

-- Create prefecture milestones tracking table
CREATE TABLE public.prefecture_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture text NOT NULL,
  milestone_hours integer NOT NULL,
  achieved_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (prefecture, milestone_hours)
);

ALTER TABLE public.prefecture_milestones ENABLE ROW LEVEL SECURITY;

-- Everyone can read milestones
CREATE POLICY "Anyone can view milestones" ON public.prefecture_milestones
  FOR SELECT TO authenticated USING (true);

-- Create a view for prefecture total hours
CREATE OR REPLACE VIEW public.prefecture_hours AS
SELECT 
  p.prefecture,
  COALESCE(SUM(s.hours), 0)::integer as total_hours,
  COUNT(DISTINCT s.user_id)::integer as user_count
FROM public.profiles p
JOIN public.shifts s ON s.user_id = p.user_id
WHERE p.prefecture IS NOT NULL
GROUP BY p.prefecture;
