-- Allow 'spend' (and 'redeem', 'adjust') type in points_history for admin point reductions
ALTER TABLE public.points_history DROP CONSTRAINT IF EXISTS points_history_type_check;

ALTER TABLE public.points_history
  ADD CONSTRAINT points_history_type_check
  CHECK (type IN ('earn', 'spend', 'redeem', 'adjust'));