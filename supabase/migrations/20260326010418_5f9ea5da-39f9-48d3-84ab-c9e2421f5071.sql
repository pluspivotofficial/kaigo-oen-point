
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referral_code text;

-- Create index for fast lookup by referral code
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals(referral_code);
