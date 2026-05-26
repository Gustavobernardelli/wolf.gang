-- Adiciona a coluna prompt na tabela channels conforme solicitado
ALTER TABLE IF EXISTS public.channels ADD COLUMN IF NOT EXISTS prompt text;
ALTER TABLE IF EXISTS public.publication_sources ADD COLUMN IF NOT EXISTS prompt text;
