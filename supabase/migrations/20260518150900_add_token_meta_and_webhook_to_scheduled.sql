-- ============================================================
-- Adicionando token_meta e webhook à tabela scheduled_posts
-- ============================================================

ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS token_meta text;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS webhook text;
