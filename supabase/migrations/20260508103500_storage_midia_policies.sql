-- PARTE 2: Storage policies no bucket Midia

-- Confirma se o bucket Midia está marcado como public = true
UPDATE storage.buckets SET public = true WHERE id = 'Midia';

-- Remove policies antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Public read on Midia bucket" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload to Midia" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update on Midia" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete from Midia" ON storage.objects;

-- Permite leitura pública (já que bucket é público, mas explicita)
CREATE POLICY "Public read on Midia bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'Midia');

-- Permite que service_role faça upload
CREATE POLICY "Service role can upload to Midia"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'Midia');

-- Permite que service_role atualize
CREATE POLICY "Service role can update on Midia"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'Midia');

-- Permite que service_role delete
CREATE POLICY "Service role can delete from Midia"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'Midia');
