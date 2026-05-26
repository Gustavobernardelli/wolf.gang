-- Adiciona a coluna ai_prompt para armazenar o prompt customizado de inteligência artificial por canal
ALTER TABLE IF EXISTS public.channels ADD COLUMN IF NOT EXISTS ai_prompt text;
ALTER TABLE IF EXISTS public.publication_sources ADD COLUMN IF NOT EXISTS ai_prompt text;
