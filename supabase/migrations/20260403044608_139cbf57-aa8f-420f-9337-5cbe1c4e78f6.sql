
ALTER TABLE public.shifts DROP CONSTRAINT shifts_shift_type_check;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_shift_type_check CHECK (shift_type = ANY (ARRAY['early'::text, 'mid'::text, 'late'::text, 'night'::text]));
