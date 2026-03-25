
-- Add quota columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS points_limit integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS points_used_this_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_reset_date date DEFAULT date_trunc('month', CURRENT_DATE)::date;

-- Create activity_log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public select on activity_log" ON public.activity_log FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Public insert on activity_log" ON public.activity_log FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Public delete on activity_log" ON public.activity_log FOR DELETE TO authenticated, anon USING (true);

-- Import existing deliveries into activity_log
INSERT INTO public.activity_log (user_id, action_type, details, created_at)
SELECT
  user_id,
  CASE
    WHEN status = 'completed' THEN 'complete_delivery'
    ELSE 'add_delivery'
  END,
  jsonb_build_object('address', address, 'customer_name', customer_name),
  created_at
FROM public.deliveries
WHERE user_id IS NOT NULL;
