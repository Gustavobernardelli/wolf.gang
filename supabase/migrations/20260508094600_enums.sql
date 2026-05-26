-- Migration: tipos enum do domínio Wolfgang

-- Status de cada notícia coletada
create type public.news_item_status as enum (
  'new',           -- recém coletada, ainda não revisada
  'reviewed',      -- vista pelo admin
  'selected',      -- escolhida pra virar arte/post
  'published',     -- já publicada em algum canal
  'archived',      -- arquivada manualmente
  'discarded',     -- descartada (não relevante)
  'duplicate'      -- marcada como duplicata de outra
);

-- Status de cada execução do coletor de feeds
create type public.collection_run_status as enum (
  'running',           -- em andamento
  'success',           -- concluído sem erros
  'partial_success',   -- concluído com alguns erros
  'failed'             -- falhou completamente
);
