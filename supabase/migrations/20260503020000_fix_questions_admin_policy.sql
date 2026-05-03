-- ============================================================
-- questions の admin ポリシーを is_admin() ベースに修正
-- 2026-05-03
-- ============================================================
-- 既存ポリシー "Admins can manage questions" は has_role() 旧方式
-- (user_roles + app_role ENUM)を使用していたが、Phase A で
-- profiles.is_admin boolean 方式に切り替えた際に修正漏れ。
-- user_roles テーブルが空のため管理者でも questions 編集不可。
--
-- H-2 (掲示板投稿+5pt) で投稿フローを触る前に整える。
-- 同じ修正漏れがある columns_articles / question_answers は
-- 別タスク扱い (このコミットでは触らない、影響範囲を minimize)。
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

DO $$ BEGIN
  CREATE POLICY "Admins can manage questions" ON public.questions
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
