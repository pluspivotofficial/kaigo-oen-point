-- ============================================================
-- 友人紹介の段階的ポイント付与
-- 2026-04-30
-- ============================================================
-- 既存: 紹介人にのみ Step1 +100pt / Step2 +500pt を付与していた
-- 新規: 被紹介人にも同額を付与する 2段階ボーナスに拡張
--
-- 重複付与防止のため referrals に2列のタイムスタンプを追加し、
-- 既存付与済みデータに遡及セットすることで併存対応する。
-- ============================================================


-- ===== 1. referrals に2段階ボーナスのタイムスタンプ追加 =====
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS signup_bonus_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_bonus_granted_at TIMESTAMPTZ;


-- ===== 2. 既存データの遡及セット =====
-- (a) Step1 (登録ボーナス): points_awarded=TRUE のものは既に紹介人へ +100pt 付与済
--     これらの行に signup_bonus_granted_at = created_at をセットして
--     新ロジック側で再付与しないよう保護する。
UPDATE public.referrals
SET signup_bonus_granted_at = created_at
WHERE points_awarded = TRUE
  AND signup_bonus_granted_at IS NULL;

-- (b) Step2 (プロフィール完成ボーナス): 旧フォーマット
--     "紹介先プロフィール完成ボーナス（<referred_user_id>）" の description で
--     紹介人へ +500pt 付与済の場合、profile_bonus_granted_at をセットする。
UPDATE public.referrals r
SET profile_bonus_granted_at = ph.created_at
FROM public.points_history ph
WHERE ph.user_id = r.referrer_id
  AND r.referred_user_id IS NOT NULL
  AND ph.description = '紹介先プロフィール完成ボーナス（' || r.referred_user_id::text || '）'
  AND r.profile_bonus_granted_at IS NULL;


-- ===== 3. インデックス (UI でのフィルタ高速化用、任意) =====
CREATE INDEX IF NOT EXISTS idx_referrals_signup_bonus
  ON public.referrals(signup_bonus_granted_at)
  WHERE signup_bonus_granted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_profile_bonus
  ON public.referrals(profile_bonus_granted_at)
  WHERE profile_bonus_granted_at IS NOT NULL;
