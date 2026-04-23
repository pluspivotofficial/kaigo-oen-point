-- 管理者が全ポイント履歴を閲覧できる
CREATE POLICY "Admins can view all points"
ON public.points_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 管理者が全ポイント履歴を更新できる
CREATE POLICY "Admins can update all points"
ON public.points_history
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 管理者が全ポイント履歴を削除できる
CREATE POLICY "Admins can delete all points"
ON public.points_history
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));