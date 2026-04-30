-- ============================================================
-- Admin Panel v1 - 管理者機能の基盤 (is_admin boolean 方式)
-- 2026-04-30
-- ============================================================
-- 単一管理者運用前提 (YAGNI)。複数ロールが必要になった時点で別途設計移行。
-- 既存の user_roles / app_role / has_role() には触らない (互換性維持)。
-- ============================================================


-- ===== 1. profiles に管理者・BAN関連カラム追加 =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 凍結中ユーザー検索高速化
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned
  ON public.profiles(is_banned) WHERE is_banned = TRUE;

-- 管理者検索 (1人のみ想定だが将来複数化のため)
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON public.profiles(is_admin) WHERE is_admin = TRUE;


-- ===== 2. is_admin 判定用 SECURITY DEFINER 関数 =====
-- RLSの自己参照再帰を回避するため必須。
-- SECURITY DEFINER は RLS をバイパスして実行されるため、
-- profiles テーブルへの再帰評価を防ぐ。
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = _user_id),
    FALSE
  );
$$;

-- 関数の実行権限制限
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;


-- ===== 3. points_history を手動操作対応に拡張 =====
ALTER TABLE public.points_history
  ADD COLUMN IF NOT EXISTS admin_action BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 管理者操作ログのフィルタリング高速化
CREATE INDEX IF NOT EXISTS idx_points_history_admin
  ON public.points_history(admin_action, created_at DESC)
  WHERE admin_action = TRUE;


-- ===== 4. campaigns テーブル新規 =====
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('seven_day', 'prefecture')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
    FOR SELECT TO authenticated
    USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage campaigns" ON public.campaigns
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ===== 5. 管理者用 RLS ポリシー (is_admin() 関数経由で再帰回避) =====
-- 一般ユーザー用の既存ポリシーは保持。
-- admin policy は OR 条件として追加され、is_admin=true の場合のみ通る。

-- profiles
DO $$ BEGIN
  CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- points_history
DO $$ BEGIN
  CREATE POLICY "Admins can manage all points" ON public.points_history
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- shifts
DO $$ BEGIN
  CREATE POLICY "Admins can view all shifts" ON public.shifts
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
