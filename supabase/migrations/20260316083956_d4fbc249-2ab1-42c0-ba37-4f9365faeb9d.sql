
-- Allow authenticated users to read all shifts for the prefecture view aggregation
CREATE POLICY "Authenticated can read all shifts for prefecture stats" ON public.shifts
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to read all profiles for prefecture view
CREATE POLICY "Authenticated can read all profiles for prefecture stats" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Drop the user-only policies that conflict (we're broadening SELECT)
DROP POLICY IF EXISTS "Users can view own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
