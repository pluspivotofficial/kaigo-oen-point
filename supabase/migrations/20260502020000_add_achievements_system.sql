-- ============================================================
-- ゲーミフィケーション G-1: バッジシステム基盤
-- 2026-05-02
-- ============================================================
-- achievements (マスター) + user_achievements (取得記録) + 判定RPC
--
-- セキュリティ:
-- - achievements: 全員 SELECT 可
-- - user_achievements: 自分の分のみ SELECT 可、直接 INSERT 禁止
-- - check_and_grant_achievements RPC は SECURITY DEFINER で
--   user_achievements への INSERT + points_history へのボーナス記録
-- ============================================================


-- ===== 1. achievements (マスター) =====
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('milestone', 'monthly', 'social', 'streak')),
  bonus_points INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "achievements_read_all" ON public.achievements
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ===== 2. user_achievements (取得記録) =====
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_achievements_read_own" ON public.user_achievements
    FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_achievements_no_direct_insert" ON public.user_achievements
    FOR INSERT TO authenticated WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 管理者は全件参照可
DO $$ BEGIN
  CREATE POLICY "user_achievements_admin_read" ON public.user_achievements
    FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id
  ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at
  ON public.user_achievements(unlocked_at DESC);


-- ===== 3. マスターデータ (10バッジ) =====
INSERT INTO public.achievements (id, name, description, emoji, category, bonus_points, display_order) VALUES
  ('first_login', 'はじめまして', '初めてログインしました', '🌸', 'milestone', 50, 1),
  ('first_shift', '駆け出し介護', '初めてシフトを登録しました', '💪', 'milestone', 100, 2),
  ('monthly_10h', '月10時間稼働', '今月10時間以上稼働しました', '⭐', 'monthly', 200, 3),
  ('monthly_50h', '月50時間稼働', '今月50時間以上稼働しました', '🏆', 'monthly', 500, 4),
  ('monthly_100h', '月100時間稼働', '今月100時間以上稼働しました', '🎖️', 'monthly', 1500, 5),
  ('total_500h', '累計500時間', '累計500時間稼働しました', '🌟', 'milestone', 1000, 6),
  ('total_1000h', '累計1,000時間', '累計1,000時間稼働しました', '👑', 'milestone', 3000, 7),
  ('first_referral', '仲間と一緒', '初めて紹介を成功させました', '🤝', 'social', 200, 8),
  ('streak_7days', '7日連続ログイン', '7日連続でログインしました', '🔥', 'streak', 300, 9),
  ('profile_complete', 'プロフィール完成', 'プロフィールを完成させました', '📍', 'milestone', 500, 10)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  emoji = EXCLUDED.emoji,
  category = EXCLUDED.category,
  bonus_points = EXCLUDED.bonus_points,
  display_order = EXCLUDED.display_order;


-- ===== 4. is_profile_complete 判定関数 =====
-- Dashboard.ProfileCompletionBanner の "10項目 (派遣なら14項目)" と
-- 完全に同じロジック。両者でズレないようサーバー側に集約。
CREATE OR REPLACE FUNCTION public.is_profile_complete(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p RECORD;
  v_count INT := 0;
  v_required INT := 10;
BEGIN
  SELECT * INTO v_p FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- 基本10項目
  IF NULLIF(TRIM(v_p.full_name), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
  IF v_p.date_of_birth IS NOT NULL THEN v_count := v_count + 1; END IF;
  IF NULLIF(TRIM(v_p.gender), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
  IF NULLIF(TRIM(v_p.address), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
  IF NULLIF(TRIM(v_p.phone_number), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
  IF NULLIF(TRIM(v_p.current_status), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
  IF NULLIF(TRIM(v_p.current_job), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
  IF NULLIF(TRIM(v_p.employment_type), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
  IF NULLIF(TRIM(v_p.care_qualifications), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
  IF NULLIF(TRIM(v_p.care_experience), '') IS NOT NULL THEN v_count := v_count + 1; END IF;

  -- 派遣の場合は +4 項目で計14項目
  IF v_p.employment_type = 'dispatch' THEN
    v_required := 14;
    IF NULLIF(TRIM(v_p.dispatch_company), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
    IF v_p.hourly_rate IS NOT NULL AND v_p.hourly_rate > 0 THEN v_count := v_count + 1; END IF;
    IF v_p.contract_end_date IS NOT NULL THEN v_count := v_count + 1; END IF;
    IF NULLIF(TRIM(v_p.work_location), '') IS NOT NULL THEN v_count := v_count + 1; END IF;
  END IF;

  RETURN v_count >= v_required;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_profile_complete(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_complete(UUID) TO authenticated;


-- ===== 5. check_and_grant_achievements RPC =====
-- 各バッジの達成判定を行い、未取得なら user_achievements + points_history に記録。
-- 戻り値: 新規付与されたバッジIDの配列 (jsonb)
CREATE OR REPLACE FUNCTION public.check_and_grant_achievements(
  target_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := target_user_id;
  v_granted TEXT[] := ARRAY[]::TEXT[];
  v_total_hours NUMERIC := 0;
  v_monthly_hours NUMERIC := 0;
  v_shift_count INT := 0;
  v_referral_count INT := 0;
  v_streak INT := 0;
  v_month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
BEGIN
  -- 自分以外への代理判定は管理者のみ
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'no user';
  END IF;
  IF v_uid != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- ===== 集計 =====
  SELECT COALESCE(SUM(hours), 0) INTO v_total_hours
    FROM public.shifts WHERE user_id = v_uid;
  SELECT COALESCE(SUM(hours), 0) INTO v_monthly_hours
    FROM public.shifts WHERE user_id = v_uid AND shift_date >= v_month_start;
  SELECT COUNT(*) INTO v_shift_count
    FROM public.shifts WHERE user_id = v_uid;
  SELECT COUNT(*) INTO v_referral_count
    FROM public.referrals
    WHERE referrer_id = v_uid AND signup_bonus_granted_at IS NOT NULL;
  SELECT COALESCE(current_streak, 0) INTO v_streak
    FROM public.login_streaks WHERE user_id = v_uid;

  -- ===== 各バッジ判定 + 付与 =====
  -- ヘルパー: バッジ未取得なら付与してリストに追加
  -- (PL/pgSQL 内ループでなく、直接 INSERT ... ON CONFLICT DO NOTHING + RETURNING で記録)

  -- first_login
  WITH ins AS (
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (v_uid, 'first_login')
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING achievement_id
  ) SELECT array_agg(achievement_id) INTO v_granted FROM (
    SELECT achievement_id FROM ins
    UNION ALL
    SELECT unnest(v_granted)
  ) t;

  -- first_shift
  IF v_shift_count >= 1 THEN
    WITH ins AS (
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_uid, 'first_shift')
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    ) SELECT array_agg(achievement_id) INTO v_granted FROM (
      SELECT achievement_id FROM ins
      UNION ALL
      SELECT unnest(COALESCE(v_granted, ARRAY[]::TEXT[]))
    ) t;
  END IF;

  -- monthly_10h / 50h / 100h
  IF v_monthly_hours >= 10 THEN
    WITH ins AS (
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_uid, 'monthly_10h')
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    ) SELECT array_agg(achievement_id) INTO v_granted FROM (
      SELECT achievement_id FROM ins UNION ALL SELECT unnest(COALESCE(v_granted, ARRAY[]::TEXT[]))
    ) t;
  END IF;
  IF v_monthly_hours >= 50 THEN
    WITH ins AS (
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_uid, 'monthly_50h')
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    ) SELECT array_agg(achievement_id) INTO v_granted FROM (
      SELECT achievement_id FROM ins UNION ALL SELECT unnest(COALESCE(v_granted, ARRAY[]::TEXT[]))
    ) t;
  END IF;
  IF v_monthly_hours >= 100 THEN
    WITH ins AS (
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_uid, 'monthly_100h')
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    ) SELECT array_agg(achievement_id) INTO v_granted FROM (
      SELECT achievement_id FROM ins UNION ALL SELECT unnest(COALESCE(v_granted, ARRAY[]::TEXT[]))
    ) t;
  END IF;

  -- total_500h / 1000h
  IF v_total_hours >= 500 THEN
    WITH ins AS (
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_uid, 'total_500h')
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    ) SELECT array_agg(achievement_id) INTO v_granted FROM (
      SELECT achievement_id FROM ins UNION ALL SELECT unnest(COALESCE(v_granted, ARRAY[]::TEXT[]))
    ) t;
  END IF;
  IF v_total_hours >= 1000 THEN
    WITH ins AS (
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_uid, 'total_1000h')
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    ) SELECT array_agg(achievement_id) INTO v_granted FROM (
      SELECT achievement_id FROM ins UNION ALL SELECT unnest(COALESCE(v_granted, ARRAY[]::TEXT[]))
    ) t;
  END IF;

  -- first_referral
  IF v_referral_count >= 1 THEN
    WITH ins AS (
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_uid, 'first_referral')
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    ) SELECT array_agg(achievement_id) INTO v_granted FROM (
      SELECT achievement_id FROM ins UNION ALL SELECT unnest(COALESCE(v_granted, ARRAY[]::TEXT[]))
    ) t;
  END IF;

  -- streak_7days
  IF v_streak >= 7 THEN
    WITH ins AS (
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_uid, 'streak_7days')
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    ) SELECT array_agg(achievement_id) INTO v_granted FROM (
      SELECT achievement_id FROM ins UNION ALL SELECT unnest(COALESCE(v_granted, ARRAY[]::TEXT[]))
    ) t;
  END IF;

  -- profile_complete
  IF public.is_profile_complete(v_uid) THEN
    WITH ins AS (
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_uid, 'profile_complete')
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id
    ) SELECT array_agg(achievement_id) INTO v_granted FROM (
      SELECT achievement_id FROM ins UNION ALL SELECT unnest(COALESCE(v_granted, ARRAY[]::TEXT[]))
    ) t;
  END IF;

  -- ===== ボーナスポイント付与 (新規付与分のみ) =====
  IF v_granted IS NOT NULL AND array_length(v_granted, 1) IS NOT NULL THEN
    INSERT INTO public.points_history (user_id, points, type, description, admin_action)
    SELECT
      v_uid,
      a.bonus_points,
      'earn',
      'バッジ獲得: ' || a.name || ' ' || a.emoji,
      FALSE
    FROM public.achievements a
    WHERE a.id = ANY(v_granted) AND a.bonus_points > 0;
  END IF;

  RETURN jsonb_build_object('granted', COALESCE(v_granted, ARRAY[]::TEXT[]));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_grant_achievements(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_grant_achievements(UUID) TO authenticated;
