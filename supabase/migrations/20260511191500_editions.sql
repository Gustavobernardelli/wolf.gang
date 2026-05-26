CREATE TABLE IF NOT EXISTS public.editions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  news_item_id uuid REFERENCES public.news_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  portal text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users on editions"
ON public.editions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role on editions"
ON public.editions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_editions_updated_at
  BEFORE UPDATE ON public.editions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
