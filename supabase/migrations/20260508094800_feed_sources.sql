-- Migration: tabela feed_sources
-- Representa cada feed RSS monitorado pelo Wolfgang

create table public.feed_sources (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  portal             text        not null,
  feed_url           text        not null unique,
  category           text,
  language           text        not null default 'pt-BR',
  active             boolean     not null default true,
  priority           smallint    not null default 5
                                 check (priority between 1 and 10),
  parser_config      jsonb,
  last_fetched_at    timestamptz,
  last_success_at    timestamptz,
  last_error         text,
  consecutive_errors integer     not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Trigger de updated_at
create trigger feed_sources_updated_at
  before update on public.feed_sources
  for each row execute function public.update_updated_at();

-- Índices
create index idx_feed_sources_active_fetched
  on public.feed_sources (active, last_fetched_at);

create index idx_feed_sources_portal
  on public.feed_sources (portal);

-- RLS
alter table public.feed_sources enable row level security;

create policy "authenticated_full_access"
  on public.feed_sources
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service_role_full_access"
  on public.feed_sources
  for all
  to service_role
  using (true)
  with check (true);
