-- ============================================================
-- Adicionando as colunas token_meta e webhook à tabela channels
-- ============================================================

ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS token_meta text;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS webhook text;
