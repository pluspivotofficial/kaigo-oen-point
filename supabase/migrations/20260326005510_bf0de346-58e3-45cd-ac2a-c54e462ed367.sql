
CREATE TABLE public.login_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_streak integer NOT NULL DEFAULT 1,
  last_login_date date NOT NULL DEFAULT CURRENT_DATE,
  longest_streak integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON public.login_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.login_streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.login_streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Add points_awarded_at to track which milestones were already rewarded
CREATE TABLE public.login_bonus_claimed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone integer NOT NULL,
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone)
);

ALTER TABLE public.login_bonus_claimed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON public.login_bonus_claimed FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own claims" ON public.login_bonus_claimed FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
