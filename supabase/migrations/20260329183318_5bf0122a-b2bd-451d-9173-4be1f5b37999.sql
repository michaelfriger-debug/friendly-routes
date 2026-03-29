
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their own driver record (during registration)
CREATE POLICY "Users can insert own driver record"
  ON public.drivers FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can view their own driver record
CREATE POLICY "Users can view own driver record"
  ON public.drivers FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admins can view all drivers (using users table role check via security definer)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = _user_id AND role = 'admin'
  )
$$;

CREATE POLICY "Admins can view all drivers"
  ON public.drivers FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can update any driver record
CREATE POLICY "Admins can update drivers"
  ON public.drivers FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
