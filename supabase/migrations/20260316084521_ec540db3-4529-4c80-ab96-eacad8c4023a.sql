
-- Allow users to update their own shifts
CREATE POLICY "Users can update own shifts" ON public.shifts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
