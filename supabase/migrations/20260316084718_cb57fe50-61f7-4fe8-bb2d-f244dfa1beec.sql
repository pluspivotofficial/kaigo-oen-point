
-- Allow users to delete their own points_history
CREATE POLICY "Users can delete own points" ON public.points_history
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to update their own points_history
CREATE POLICY "Users can update own points" ON public.points_history
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
