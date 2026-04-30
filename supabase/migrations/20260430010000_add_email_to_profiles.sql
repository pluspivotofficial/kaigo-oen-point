-- ============================================================
-- Add email column to profiles + sync from auth.users
-- 2026-04-30
-- ============================================================
-- 管理画面のユーザー一覧でメアド表示するため、profiles テーブルに
-- email カラムを追加し、auth.users と同期する仕組みを構築。
--
-- 同期方針:
-- 1. handle_new_user() トリガーで signup 時に email も INSERT
-- 2. sync_profile_email() トリガーで auth.users.email 変更時に同期
-- ============================================================


-- ===== 1. profiles に email カラム追加 =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;


-- ===== 2. 既存 profiles を auth.users から backfill =====
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.email IS NULL OR p.email = '');


-- ===== 3. handle_new_user() トリガー関数を更新（email も INSERT） =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;


-- ===== 4. auth.users.email 変更時に profiles.email を同期するトリガー =====
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- email が実際に変わった場合のみ UPDATE
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();


-- ===== 5. メアド検索高速化（管理画面でメアド検索するため）=====
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email);
