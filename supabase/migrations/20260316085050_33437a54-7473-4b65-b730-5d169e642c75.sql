
-- Create user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- user_roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create columns table
CREATE TABLE public.columns_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  excerpt text,
  thumbnail_url text,
  category text NOT NULL DEFAULT 'general',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  author_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.columns_articles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read published columns
CREATE POLICY "Anyone can read published columns" ON public.columns_articles
  FOR SELECT TO authenticated
  USING (is_published = true);

-- Admins can do everything on columns
CREATE POLICY "Admins can manage columns" ON public.columns_articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_columns_updated_at
  BEFORE UPDATE ON public.columns_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for column images
INSERT INTO storage.buckets (id, name, public) VALUES ('column-images', 'column-images', true);

CREATE POLICY "Anyone can read column images" ON storage.objects
  FOR SELECT USING (bucket_id = 'column-images');

CREATE POLICY "Admins can upload column images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'column-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete column images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'column-images' AND public.has_role(auth.uid(), 'admin'));
