-- ====================================================================
-- Adiciona colunas para Token Meta e Webhook na tabela channels
-- ====================================================================

ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS meta_token text;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS webhook_url text;
