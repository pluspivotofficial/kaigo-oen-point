-- ============================================================
-- お知らせ (notices) に期限フィールドを追加
-- 2026-05-03
-- ============================================================
-- start_date / end_date を追加し、管理者がキャンペーン期間を
-- 設定可能にする。Dashboard 側ではこの期間を満たす notices のみ表示。
-- これにより既存の hardcoded CampaignBanner を DB 駆動に置換。
-- 'banner' カテゴリも実質的に追加 (CHECK 制約は既存もないため text 自由)
-- ============================================================

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN public.notices.start_date IS '表示開始日 (NULL=即時開始)';
COMMENT ON COLUMN public.notices.end_date IS '表示終了日 (NULL=無期限)';
COMMENT ON COLUMN public.notices.category IS 'info | campaign | event | new | banner';

-- 期限フィルタの高速化 (期間中の notices を Dashboard で頻繁に取得)
CREATE INDEX IF NOT EXISTS idx_notices_published_dates
  ON public.notices(is_published, start_date, end_date)
  WHERE is_published = TRUE;
