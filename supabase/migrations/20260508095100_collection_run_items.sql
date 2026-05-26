-- Migration: tabela collection_run_items
-- Vincula cada notícia à execução que a coletou.
-- Permite responder "quais notícias foram coletadas na rodada X?"

create table public.collection_run_items (
  id            uuid        primary key default gen_random_uuid(),
  run_id        uuid        not null
                            references public.collection_runs(id)
                            on delete cascade,
  news_item_id  uuid        not null
                            references public.news_items(id)
                            on delete cascade,
  was_new       boolean     not null default true,
  created_at    timestamptz not null default now(),

  constraint uq_run_news_item unique (run_id, news_item_id)
);

-- Índices para JOINs frequentes
create index idx_collection_run_items_run_id
  on public.collection_run_items (run_id);

create index idx_collection_run_items_news_item_id
  on public.collection_run_items (news_item_id);

-- RLS
alter table public.collection_run_items enable row level security;

create policy "authenticated_full_access"
  on public.collection_run_items
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service_role_full_access"
  on public.collection_run_items
  for all
  to service_role
  using (true)
  with check (true);
