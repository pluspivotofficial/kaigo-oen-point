-- ============================================================
-- get_user_last_sign_in(uuid[]) RPC 関数
-- 2026-05-02
-- ============================================================
-- 管理画面のユーザー一覧で最終ログイン日時を表示するため、
-- auth.users.last_sign_in_at を一括取得する RPC 関数を追加。
--
-- 理由: anon キーから auth schema を直接 SELECT できないため、
--       SECURITY DEFINER 関数経由で取得する。
-- セキュリティ: 関数内で is_admin(auth.uid()) を必須チェックし、
--               非管理者には例外を返す。
-- N+1 回避: uuid[] 配列で一括クエリ可能。
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_last_sign_in(_user_ids uuid[])
RETURNS TABLE(user_id uuid, last_sign_in_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 呼び出し元が管理者か確認
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  RETURN QUERY
    SELECT u.id AS user_id, u.last_sign_in_at
    FROM auth.users u
    WHERE u.id = ANY(_user_ids);
END;
$$;

-- 権限制限: authenticated のみ実行可能 (関数内で is_admin チェック)
REVOKE EXECUTE ON FUNCTION public.get_user_last_sign_in(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_last_sign_in(uuid[]) TO authenticated;
