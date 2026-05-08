-- ============================================================
-- profiles.referral_processed_at 追加 (H-8 真の完成)
-- 2026-05-08
-- ============================================================
-- email 確認後の初回ログイン時に AuthContext で
-- apply_referral_signup_bonus RPC を1回だけ呼び出すための
-- idempotency 保証フラグ。
--
-- NULL = 未処理 (次回ログイン時に試行)
-- TIMESTAMPTZ = 処理済 (RPC の granted/not_found 結果に関わらず
--   一度試行したらフラグセットして再試行ループを防ぐ)
--
-- profiles の既存 RLS は user 自身の SELECT/UPDATE を許可済のため
-- 新列も追加でクライアントから読み書き可能 (RLS 変更不要)。
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_processed_at TIMESTAMPTZ NULL;
