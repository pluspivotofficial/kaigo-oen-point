-- ============================================================
-- referrals の admin SELECT ポリシーを is_admin() ベースに修正
-- 2026-05-07
-- ============================================================
-- 既存ポリシー "Admins can view all referrals" は has_role() 旧方式
-- (user_roles + app_role ENUM)を使用していたが、Phase A で
-- profiles.is_admin boolean 方式に切り替えた際に修正漏れ。
-- user_roles テーブルが空のため、管理者でも自分発行の referrals
-- (auth.uid() = referrer_id 経由)しか SELECT できなかった。
--
-- 結果として H-6 紹介ファネル KPI で件数不整合が発生。
-- /admin/referrals の一覧でも他ユーザー発行分が見えない問題があった。
--
-- 同 migration の "Admins can update referrals" / points_history の
-- "Admins can insert points for referrals" も has_role 残置だが、
-- スコープ外 (Phase A 残滓 backlog 行き、別タスクで扱う)。
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;

DO $$ BEGIN
  CREATE POLICY "Admins can view all referrals" ON public.referrals
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
