-- ============================================================
-- 掲示板投稿ボーナス +5pt 付与 RPC
-- 2026-05-03
-- ============================================================
-- 質問投稿時に +5pt を付与する SECURITY DEFINER 関数。
-- スパム対策:
--   - 文字数 (title + body 合算) 20文字以上
--   - 24時間以内の自分の質問数 3件まで (4件目以降は無償)
--   - 同じ質問IDで二重付与しない
-- silent fail: 条件未達は granted=false で返す (UI側でエラー表示しない)
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_question_post_points(
  p_question_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q RECORD;
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'no user';
  END IF;

  -- 1. 質問取得 + 所有者確認
  SELECT * INTO v_q FROM public.questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'not_found');
  END IF;
  IF v_q.user_id <> v_uid THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'not_owner');
  END IF;

  -- 2. 文字数判定 (title + body 合算で 20文字以上、TRIM で空白カウントなし)
  IF length(trim(coalesce(v_q.title, ''))) + length(trim(coalesce(v_q.body, ''))) < 20 THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'too_short');
  END IF;

  -- 3. 24時間以内の自分の質問数 (今回投稿分も含む、4件目以降スキップ)
  SELECT COUNT(*) INTO v_count
  FROM public.questions
  WHERE user_id = v_uid AND created_at > now() - interval '24 hours';
  IF v_count > 3 THEN
    RETURN jsonb_build_object(
      'granted', FALSE,
      'reason', 'rate_limit',
      'count', v_count
    );
  END IF;

  -- 4. 重複付与防止 (reason 列で question_id を識別、UNIQUE制約は使わず EXISTS で確認)
  IF EXISTS (
    SELECT 1 FROM public.points_history
    WHERE user_id = v_uid AND reason = 'question:' || p_question_id::text
  ) THEN
    RETURN jsonb_build_object('granted', FALSE, 'reason', 'already_granted');
  END IF;

  -- 5. ポイント付与
  -- type='earn' (CHECK 制約合致), admin_action=false (システム自動)
  INSERT INTO public.points_history (
    user_id, points, type, description, reason, admin_action
  ) VALUES (
    v_uid, 5, 'earn', '掲示板投稿ボーナス',
    'question:' || p_question_id::text, FALSE
  );

  RETURN jsonb_build_object('granted', TRUE, 'points', 5);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_question_post_points(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_question_post_points(UUID) TO authenticated;
