
-- Fix security definer view
CREATE OR REPLACE VIEW public.prefecture_hours 
WITH (security_invoker = true) AS
SELECT 
  p.prefecture,
  COALESCE(SUM(s.hours), 0)::integer as total_hours,
  COUNT(DISTINCT s.user_id)::integer as user_count
FROM public.profiles p
JOIN public.shifts s ON s.user_id = p.user_id
WHERE p.prefecture IS NOT NULL
GROUP BY p.prefecture;
