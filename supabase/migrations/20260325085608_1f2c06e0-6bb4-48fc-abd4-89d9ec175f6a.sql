
CREATE POLICY "Public select on users" ON public.users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert on users" ON public.users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update on users" ON public.users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
