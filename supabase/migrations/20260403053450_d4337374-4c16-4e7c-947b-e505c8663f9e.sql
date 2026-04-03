
ALTER TABLE public.shifts DROP CONSTRAINT shifts_shift_type_check;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_shift_type_check CHECK (shift_type = ANY (ARRAY['early'::text, 'day'::text, 'late'::text, 'night'::text, 'off'::text, 'mid'::text]));
