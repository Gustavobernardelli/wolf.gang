-- Allow anonymous users to use the editions table (useful for local dev and internal tool)
CREATE POLICY "Allow anon on editions"
ON public.editions
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
