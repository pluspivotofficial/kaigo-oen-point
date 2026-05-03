-- ============================================================
-- 一斉メール配信システム MVP (H-3a)
-- 2026-05-03
-- ============================================================
-- email_campaigns / email_send_logs / email_unsubscribe_tokens
-- + profiles.email_opt_out + Storage バケット (画像用)
-- + ロック取得 / 配信停止 RPC
--
-- 設計方針:
-- - 旧 Lovable email_infra (DLQ, pgmq) は再利用せず、シンプル化
-- - 同期送信前提 (31名規模、1ループで完結)
-- - send_lock_token で二重送信防止 (atomic UPDATE)
-- - 失敗者再送信は status='failed' の logs のみ対象
-- ============================================================


-- ===== 1. email_campaigns (マスター) =====
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  target_filter JSONB NOT NULL DEFAULT '{"type":"all"}'::jsonb,
  -- type: 'all' (MVP) | 'prefecture' (将来) | 'active' (将来)
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'sent', 'partial_failed', 'failed')),
  send_lock_token UUID,
  send_lock_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can manage email_campaigns"
    ON public.email_campaigns FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status_created
  ON public.email_campaigns(status, created_at DESC);


-- ===== 2. email_send_logs (1配信1行、監査用) =====
CREATE TABLE IF NOT EXISTS public.email_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped_unsubscribed', 'skipped_test')),
  error_message TEXT,
  resend_message_id TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, recipient_email)
);

ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can read email_send_logs"
    ON public.email_send_logs FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INSERT/UPDATE/DELETE は service_role 経由 (Edge Function) のみ。
-- 直接 INSERT は禁止。
DO $$ BEGIN
  CREATE POLICY "No direct insert email_send_logs"
    ON public.email_send_logs FOR INSERT TO authenticated WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_logs_campaign
  ON public.email_send_logs(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_recipient
  ON public.email_send_logs(recipient_email);


-- ===== 3. email_unsubscribe_tokens (配信停止トークン) =====
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- 公開不可 (RPC use_unsubscribe_token 経由のみアクセス)
-- service_role のみ INSERT/SELECT。直接 SELECT/INSERT は全部禁止。
DO $$ BEGIN
  CREATE POLICY "No direct access email_unsubscribe_tokens"
    ON public.email_unsubscribe_tokens FOR ALL TO authenticated, anon
    USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_email
  ON public.email_unsubscribe_tokens(email);


-- ===== 4. profiles に email_opt_out 追加 =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_email_opt_out
  ON public.profiles(email_opt_out) WHERE email_opt_out = TRUE;


-- ===== 5. Storage bucket (メール画像用、5MB制限、画像のみ) =====
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-campaign-images',
  'email-campaign-images',
  TRUE,
  5242880,   -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS (storage.objects)
DO $$ BEGIN
  CREATE POLICY "Anyone can read campaign images"
    ON storage.objects FOR SELECT TO authenticated, anon
    USING (bucket_id = 'email-campaign-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can upload campaign images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'email-campaign-images' AND public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete campaign images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'email-campaign-images' AND public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ===== 6. acquire_campaign_send_lock RPC (二重送信防止) =====
-- atomic UPDATE: lock を取れた人だけが TRUE を受け取る
-- 10分以上経った lock はタイムアウト扱いで奪える (デッドロック防止)
CREATE OR REPLACE FUNCTION public.acquire_campaign_send_lock(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  UPDATE public.email_campaigns
  SET
    send_lock_token = gen_random_uuid(),
    send_lock_at = now(),
    status = 'sending'
  WHERE id = p_campaign_id
    AND (
      send_lock_token IS NULL
      OR send_lock_at < now() - interval '10 minutes'
    )
    AND status IN ('draft', 'partial_failed', 'failed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_campaign_send_lock(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_campaign_send_lock(UUID) TO authenticated;


-- ===== 7. release_campaign_send_lock RPC =====
-- 送信完了後にロック解放 + status 確定
-- service_role 経由 (Edge Function) で呼ぶ想定だが authenticated でも呼べるよう開放
CREATE OR REPLACE FUNCTION public.release_campaign_send_lock(
  p_campaign_id UUID,
  p_status TEXT,           -- 'sent' | 'partial_failed' | 'failed'
  p_sent_count INT,
  p_failed_count INT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('sent', 'partial_failed', 'failed') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  UPDATE public.email_campaigns
  SET
    send_lock_token = NULL,
    send_lock_at = NULL,
    status = p_status,
    sent_count = p_sent_count,
    failed_count = p_failed_count,
    sent_at = COALESCE(sent_at, now())
  WHERE id = p_campaign_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_campaign_send_lock(UUID, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_campaign_send_lock(UUID, TEXT, INT, INT) TO authenticated;


-- ===== 8. use_unsubscribe_token RPC (配信停止) =====
-- token-based、認証不要。anon でも呼べる。
CREATE OR REPLACE FUNCTION public.use_unsubscribe_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record FROM public.email_unsubscribe_tokens WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'reason', 'invalid_token');
  END IF;

  IF v_record.used_at IS NOT NULL THEN
    -- 冪等: 既に使用済でも success を返す (再訪問時の体験向上)
    RETURN jsonb_build_object('success', TRUE, 'email', v_record.email, 'already_used', TRUE);
  END IF;

  UPDATE public.email_unsubscribe_tokens
  SET used_at = now()
  WHERE token = p_token;

  -- profile があれば opt_out flip
  IF v_record.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET email_opt_out = TRUE
    WHERE user_id = v_record.user_id;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'email', v_record.email);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.use_unsubscribe_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.use_unsubscribe_token(TEXT) TO anon, authenticated;
