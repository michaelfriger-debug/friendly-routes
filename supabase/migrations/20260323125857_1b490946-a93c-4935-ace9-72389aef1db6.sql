
CREATE TABLE public.geocode_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read geocode cache"
  ON public.geocode_cache FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert geocode cache"
  ON public.geocode_cache FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
