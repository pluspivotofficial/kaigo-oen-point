CREATE OR REPLACE FUNCTION public.get_referral_user_points(referral_codes text[])
RETURNS TABLE(referral_code text, total_points bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.referral_code, COALESCE(SUM(ph.points), 0)::bigint as total_points
  FROM public.referrals r
  LEFT JOIN public.profiles p ON p.display_name = r.referral_code  -- We need a different join
  LEFT JOIN public.points_history ph ON ph.user_id = p.user_id AND ph.type = 'earn'
  WHERE r.referral_code = ANY(referral_codes)
  GROUP BY r.referral_code;
$$;