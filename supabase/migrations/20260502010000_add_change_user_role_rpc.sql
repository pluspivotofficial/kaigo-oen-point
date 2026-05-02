-- ============================================================
-- ユーザー権限の昇格/降格 (admin ↔ user)
-- 2026-05-02
-- ============================================================
-- 既存の profiles.is_admin (boolean) を更新する RPC 関数と、
-- 管理者操作の汎用ログテーブル admin_action_logs を新規作成。
--
-- セキュリティガード:
-- 1. 呼び出し元が is_admin であること
-- 2. 自分自身の権限変更は禁止 (ロックアウト事故防止)
-- 3. RPC は SECURITY DEFINER、INSERT は RPC 経由のみ
-- ============================================================


-- ===== 1. admin_action_logs テーブル新規作成 =====
-- 汎用の管理者操作ログ。今回の role 変更だけでなく、
-- 将来の BAN / Unban / その他の admin 操作も同じテーブルに蓄積予定。
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,           -- 'role_promote' | 'role_demote' (将来拡張)
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- 管理者は全件参照可
DO $$ BEGIN
  CREATE POLICY "Admins can read all action logs" ON public.admin_action_logs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INSERT は RPC (SECURITY DEFINER) 経由のみ。直接 INSERT は禁止。
DO $$ BEGIN
  CREATE POLICY "No direct insert" ON public.admin_action_logs
    FOR INSERT TO authenticated
    WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created
  ON public.admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action
  ON public.admin_action_logs(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target
  ON public.admin_action_logs(target_user_id);


-- ===== 2. change_user_role RPC 関数 =====
-- profiles.is_admin (boolean) を更新する。
-- 引数 new_role は 'admin' | 'user' の TEXT で受け取り、
-- 内部で is_admin = (new_role = 'admin') の boolean に変換。
CREATE OR REPLACE FUNCTION public.change_user_role(
  target_user_id UUID,
  new_role TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_make_admin BOOLEAN;
BEGIN
  -- (1) 呼び出し元が admin か確認
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  -- (2) 自分自身の権限変更は禁止 (ロックアウト事故防止)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION '自分自身の権限は変更できません';
  END IF;

  -- (3) 値検証
  IF new_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'invalid role: %', new_role;
  END IF;

  v_make_admin := (new_role = 'admin');

  -- (4) profiles.is_admin を更新
  UPDATE public.profiles
  SET is_admin = v_make_admin,
      updated_at = NOW()
  WHERE user_id = target_user_id;

  -- 対象が存在しなかった場合は失敗扱い (誤った user_id 防止)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user_id %', target_user_id;
  END IF;

  -- (5) 操作ログ記録
  INSERT INTO public.admin_action_logs (
    admin_user_id, action_type, target_user_id, details
  ) VALUES (
    auth.uid(),
    CASE WHEN v_make_admin THEN 'role_promote' ELSE 'role_demote' END,
    target_user_id,
    jsonb_build_object('new_role', new_role)
  );
END;
$$;

-- 権限制限: authenticated のみ実行可 (関数内で is_admin チェック)
REVOKE EXECUTE ON FUNCTION public.change_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_user_role(UUID, TEXT) TO authenticated;
