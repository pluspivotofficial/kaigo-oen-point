
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_user_id uuid;

DROP FUNCTION IF EXISTS public.get_referral_user_points(text[]);

CREATE OR REPLACE FUNCTION public.get_referral_user_points(_referrer_id uuid)
RETURNS TABLE(referral_id uuid, total_points bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id as referral_id, COALESCE(SUM(ph.points), 0)::bigint as total_points
  FROM public.referrals r
  LEFT JOIN public.points_history ph ON ph.user_id = r.referred_user_id AND ph.type = 'earn'
  WHERE r.referrer_id = _referrer_id AND r.referred_user_id IS NOT NULL
  GROUP BY r.id;
$$;
