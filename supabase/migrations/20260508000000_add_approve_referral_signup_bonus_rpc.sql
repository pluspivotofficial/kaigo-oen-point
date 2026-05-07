-- ============================================================
-- 紹介 Step1 ボーナス管理者承認 RPC (H-7)
-- 2026-05-08
-- ============================================================
-- 旧 AdminReferralsPage は status UPDATE + points_history INSERT を
-- クライアント側で2段で行っていたが、UPDATE 側が has_role() ベースの
-- RLS で silently fail (0行更新) → INSERT のみ成功 → status='pending'
-- のまま残り、再表示時に承認ボタンが再登場 → 何度でも +100pt 付与可能
-- というバグが起きていた (最大15回付与の事象が発生)。
--
-- 本 RPC は SECURITY DEFINER で RLS をバイパスし、idempotent な
-- atomic 操作として承認 + 付与を1呼出に統合する。
--
-- 重要:
--   - signup_bonus_granted_at IS NULL を条件にした atomic UPDATE で
--     同時クリックレースに対する単一勝者を保証
--   - reason 列に referral_signup_admin:<uuid> を埋め込んで監査性確保
--   - admin_action=TRUE + admin_user_id 記録で運用ログ整合
--
-- スコープ外 (別タスク backlog):
--   - 既存の過剰付与 8件のレコード修復 (経営判断で意図放置)
--   - "Admins can update referrals" の has_role → is_admin 移行
--   - "Admins can insert points for referrals" の has_role 移行
--   - AuthPage の自動承認フロー改修
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_referral_signup_bonus(
  p_referral_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref RECORD;
  v_updated INT;
BEGIN
  -- 1. 管理者チェック
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  -- 2. referral 取得
  SELECT * INTO v_ref FROM public.referrals WHERE id = p_referral_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'not_found');
  END IF;

  -- 3. 既に granted_at セット済 → 即時返却 (二重付与防止)
  IF v_ref.signup_bonus_granted_at IS NOT NULL THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'already_granted');
  END IF;

  -- 4. atomic UPDATE: WHERE 句に granted_at IS NULL を入れてレース対策
  --    (同時クリックでも勝者は1つだけ、敗者は v_updated=0 で受ける)
  UPDATE public.referrals
  SET status = 'completed_registered',
      points_awarded = TRUE,
      signup_bonus_granted_at = now()
  WHERE id = p_referral_id
    AND signup_bonus_granted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'race_lost');
  END IF;

  -- 5. 紹介人にのみ +100pt 付与
  --    (被紹介人は紐付け不明のため対象外。AuthPage 経由の自動承認時のみ
  --     被紹介人にも +100pt 付与される設計を維持)
  INSERT INTO public.points_history (
    user_id, points, type, description, reason, admin_action, admin_user_id
  ) VALUES (
    v_ref.referrer_id,
    100,
    'earn',
    '紹介ボーナス[Step1]管理者承認',
    'referral_signup_admin:' || p_referral_id::text,
    TRUE,
    auth.uid()
  );

  RETURN jsonb_build_object('granted', TRUE, 'points', 100);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_referral_signup_bonus(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_referral_signup_bonus(UUID) TO authenticated;
