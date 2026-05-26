-- ============================================================
-- Renomeando token_meta para token_instagram
-- E adicionando coluna token_facebook
-- ============================================================

-- Rename token_meta to token_instagram in channels table
ALTER TABLE public.channels RENAME COLUMN token_meta TO token_instagram;

-- Rename token_meta to token_instagram in scheduled_posts table
ALTER TABLE public.scheduled_posts RENAME COLUMN token_meta TO token_instagram;

-- Add token_facebook to channels table
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS token_facebook text;

-- Add token_facebook to scheduled_posts table
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS token_facebook text;
