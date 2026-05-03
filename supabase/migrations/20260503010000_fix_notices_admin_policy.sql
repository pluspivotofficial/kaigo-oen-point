-- ============================================================
-- notices の admin ポリシーを is_admin() ベースに修正
-- 2026-05-03
-- ============================================================
-- 既存ポリシー "Admins can manage notices" は has_role() 旧方式
-- (user_roles + app_role ENUM)を使用していたが、Phase A で
-- profiles.is_admin boolean 方式に切り替えた際に修正漏れ。
-- user_roles テーブルが空のため管理者でも notices 編集不可。
--
-- 対処: 旧ポリシーを DROP し、is_admin(auth.uid()) ベースで再作成。
-- 既存 Phase A の admin RLS と一貫性が取れる。
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage notices" ON public.notices;

DO $$ BEGIN
  CREATE POLICY "Admins can manage notices" ON public.notices
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
