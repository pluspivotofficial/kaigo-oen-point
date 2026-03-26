
ALTER TABLE public.referrals ALTER COLUMN friend_name DROP NOT NULL;
ALTER TABLE public.referrals ALTER COLUMN friend_contact DROP NOT NULL;
ALTER TABLE public.referrals ALTER COLUMN friend_name SET DEFAULT '';
ALTER TABLE public.referrals ALTER COLUMN friend_contact SET DEFAULT '';
