
-- Likes for questions
CREATE TABLE public.question_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);

ALTER TABLE public.question_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes" ON public.question_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own likes" ON public.question_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.question_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Likes for answers
CREATE TABLE public.answer_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid REFERENCES public.question_answers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(answer_id, user_id)
);

ALTER TABLE public.answer_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all answer likes" ON public.answer_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own answer likes" ON public.answer_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own answer likes" ON public.answer_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
