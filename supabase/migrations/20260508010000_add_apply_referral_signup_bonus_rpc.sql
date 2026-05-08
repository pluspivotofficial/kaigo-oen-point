-- ============================================================
-- 紹介 Step1 ボーナス自動承認 RPC (H-8 / AuthPage 用)
-- 2026-05-08
-- ============================================================
-- 旧 AuthPage.processReferralCode は SELECT/UPDATE/INSERT を
-- クライアント側で5段に分けて直列実行していたが、いずれも RLS の
-- 制約下で silently fail (0行) するケースが多く、結果として
-- referred_user_id がセットされない / 紹介人 +100pt が付かない
-- 等の不整合が頻発していた (18件以上の referred_user_id NULL)。
--
-- 本 RPC は SECURITY DEFINER で RLS をバイパスし、idempotent な
-- atomic 操作として承認 + 両者付与を1呼出に統合する。
-- H-7 の approve_referral_signup_bonus と同じ設計パターン。
--
-- 重要:
--   - auth.uid() を内部参照 (引数では受け取らない) → 横取り攻撃を
--     構造的に防止 (他人の UUID で +100 を消費するスポーフ不可)
--   - signup_bonus_granted_at IS NULL を WHERE に含めた atomic UPDATE
--     で同時実行レースに対する単一勝者を保証
--   - reason 列に referral_signup_auto:<uuid> を埋め込んで H-7 系の
--     管理者承認 (referral_signup_admin) と区別可能
--   - 被紹介人にも reason: referral_signup_received:<uuid> で記録
--
-- スコープ外 (別タスク backlog):
--   - 既存 18件以上の referred_user_id NULL レコード遡及修復
--   - "Admins can update referrals" の has_role 残置
--   - "Admins can insert points for referrals" 同上
--   - status CHECK 制約の整理
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_referral_signup_bonus(
  p_referral_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ref RECORD;
  v_updated INT;
BEGIN
  -- 1. 認証セッション確認 (signUp 直後の session 未確立対策)
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'no_session');
  END IF;

  -- 2. referral 取得 (status='pending' のみ、最新)
  SELECT * INTO v_ref FROM public.referrals
  WHERE referral_code = p_referral_code
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'not_found');
  END IF;

  -- 3. self-referral check
  IF v_ref.referrer_id = v_uid THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'self_referral');
  END IF;

  -- 4. 既に granted_at セット済 → 即時返却 (二重付与防止)
  IF v_ref.signup_bonus_granted_at IS NOT NULL THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'already_granted');
  END IF;

  -- 5. atomic UPDATE: WHERE 句に granted_at IS NULL を入れてレース対策
  UPDATE public.referrals
  SET status = 'completed_registered',
      referred_user_id = v_uid,
      points_awarded = TRUE,
      signup_bonus_granted_at = now()
  WHERE id = v_ref.id
    AND signup_bonus_granted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'race_lost');
  END IF;

  -- 6. 紹介人に +100pt
  INSERT INTO public.points_history (
    user_id, points, type, description, reason, admin_action
  ) VALUES (
    v_ref.referrer_id,
    100,
    'earn',
    '紹介ボーナス[Step1]登録完了',
    'referral_signup_auto:' || v_ref.id::text,
    FALSE
  );

  -- 7. 被紹介人に +100pt
  INSERT INTO public.points_history (
    user_id, points, type, description, reason, admin_action
  ) VALUES (
    v_uid,
    100,
    'earn',
    '紹介ボーナス[Step1]登録特典',
    'referral_signup_received:' || v_ref.id::text,
    FALSE
  );

  RETURN jsonb_build_object('granted', TRUE, 'points', 100);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_referral_signup_bonus(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_referral_signup_bonus(TEXT) TO authenticated;
