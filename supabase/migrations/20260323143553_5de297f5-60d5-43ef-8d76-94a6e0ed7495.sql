CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  customer_name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.deliveries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert access" ON public.deliveries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update access" ON public.deliveries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete access" ON public.deliveries FOR DELETE TO anon, authenticated USING (true);