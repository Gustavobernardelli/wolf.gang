-- ============================================================
-- Migração para limpeza do banco de dados (Remoção de tabelas não utilizadas)
-- ============================================================

DROP TABLE IF EXISTS public.mockups CASCADE;
DROP TABLE IF EXISTS public.mockup_format_specs CASCADE;
DROP TABLE IF EXISTS public.available_fonts CASCADE;
DROP TABLE IF EXISTS public.publication_sources CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.feed_validation_logs CASCADE;
