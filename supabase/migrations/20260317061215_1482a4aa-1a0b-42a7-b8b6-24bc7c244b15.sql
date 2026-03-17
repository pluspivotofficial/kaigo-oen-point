
-- Questions table
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  is_approved boolean NOT NULL DEFAULT false,
  is_rejected boolean NOT NULL DEFAULT false,
  anonymous_name text NOT NULL DEFAULT '匿名ユーザー',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  answer_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Users can submit questions
CREATE POLICY "Users can insert own questions" ON public.questions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view own questions (even unapproved)
CREATE POLICY "Users can view own questions" ON public.questions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Everyone can view approved questions
CREATE POLICY "Anyone can view approved questions" ON public.questions
  FOR SELECT TO authenticated
  USING (is_approved = true);

-- Admins can manage all questions
CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Question answers table
CREATE TABLE public.question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  anonymous_name text NOT NULL DEFAULT '匿名ユーザー',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view answers for approved questions
CREATE POLICY "Anyone can view answers for approved questions" ON public.question_answers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.questions WHERE id = question_id AND is_approved = true));

-- Users can insert answers
CREATE POLICY "Users can insert answers" ON public.question_answers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own answers
CREATE POLICY "Users can delete own answers" ON public.question_answers
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all answers
CREATE POLICY "Admins can manage answers" ON public.question_answers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to increment answer count
CREATE OR REPLACE FUNCTION public.increment_answer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_answer_insert
  AFTER INSERT ON public.question_answers
  FOR EACH ROW EXECUTE FUNCTION public.increment_answer_count();

-- Function to decrement answer count
CREATE OR REPLACE FUNCTION public.decrement_answer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.questions SET answer_count = answer_count - 1 WHERE id = OLD.question_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_answer_delete
  AFTER DELETE ON public.question_answers
  FOR EACH ROW EXECUTE FUNCTION public.decrement_answer_count();
