-- Create notices table for admin-managed announcements/campaigns
CREATE TABLE public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'info',
  is_published BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published notices"
ON public.notices FOR SELECT
TO authenticated
USING (is_published = true);

CREATE POLICY "Admins can manage notices"
ON public.notices FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_notices_updated_at
BEFORE UPDATE ON public.notices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with default notices
INSERT INTO public.notices (title, description, category, display_order) VALUES
('春の紹介キャンペーン開催中！', '3/31まで友人紹介で通常の2倍、30,000ポイントもらえる！', 'campaign', 1),
('4月のシフト申請受付開始', '4月分のシフト申請が可能になりました。お早めに申請ください。', 'info', 2),
('【4/12開催】介護職交流会 in 渋谷', '他施設のスタッフと情報交換できる交流イベント！軽食付き・参加無料。定員30名。', 'event', 3),
('ポイント還元サイトがリニューアル', 'より使いやすくなりました。新しいサイトをチェック！', 'new', 4);