-- Migration: tabela news_items
-- Cada registro representa uma notícia única coletada de um feed RSS

create table public.news_items (
  id                  uuid                    primary key default gen_random_uuid(),
  source_id           uuid                    not null
                                              references public.feed_sources(id)
                                              on delete cascade,
  external_id         text                    not null,
  guid                text,
  title               text                    not null,
  subtitle            text,
  description         text,
  description_html    text,
  content             text,
  link                text                    not null,
  image_url           text,
  image_source_field  text,
  author              text,
  categories          text[],
  portal              text                    not null,
  published_at        timestamptz             not null,
  collected_at        timestamptz             not null default now(),
  raw_data            jsonb                   not null,
  relevance_score     numeric(5,2),
  status              public.news_item_status not null default 'new',
  created_at          timestamptz             not null default now(),
  updated_at          timestamptz             not null default now(),

  -- Unicidade: mesma notícia da mesma fonte não duplica
  constraint uq_news_source_external unique (source_id, external_id),

  -- Mesmo link de fontes diferentes não duplica
  constraint uq_news_link unique (link),

  -- Proteção contra datas absurdas no futuro (tolerância de 1h pra fuso)
  constraint chk_published_at_not_future
    check (published_at <= (now() + interval '1 hour'))
);

-- Trigger de updated_at
create trigger news_items_updated_at
  before update on public.news_items
  for each row execute function public.update_updated_at();

-- Índice de suporte para FK (source_id)
create index idx_news_items_source_id
  on public.news_items (source_id);

-- Query principal do feed: por status + data
create index idx_news_items_status_published
  on public.news_items (status, published_at desc);

-- Filtro por portal + data
create index idx_news_items_portal_published
  on public.news_items (portal, published_at desc);

-- Paginação por data
create index idx_news_items_published_at
  on public.news_items (published_at desc);

-- Ranking por relevância
create index idx_news_items_relevance
  on public.news_items (relevance_score desc nulls last);

-- Busca em arrays de categorias
create index idx_news_items_categories
  on public.news_items using gin (categories);

-- Queries em campos não estruturados do RSS
create index idx_news_items_raw_data
  on public.news_items using gin (raw_data);

-- RLS
alter table public.news_items enable row level security;

create policy "authenticated_full_access"
  on public.news_items
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service_role_full_access"
  on public.news_items
  for all
  to service_role
  using (true)
  with check (true);
