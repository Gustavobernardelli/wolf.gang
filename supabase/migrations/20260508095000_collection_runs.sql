-- Migration: tabela collection_runs
-- Log de cada execução do coletor de feeds. Crítico para debug e UI de status.

create table public.collection_runs (
  id                uuid                        primary key default gen_random_uuid(),
  triggered_by      text                        not null default 'manual'
                                                check (triggered_by in ('cron', 'manual', 'api')),
  status            public.collection_run_status not null default 'running',
  started_at        timestamptz                 not null default now(),
  finished_at       timestamptz,
  duration_ms       integer
                    generated always as (
                      case
                        when finished_at is not null
                        then extract(epoch from (finished_at - started_at))::integer * 1000
                        else null
                      end
                    ) stored,
  sources_total     integer                     not null default 0,
  sources_success   integer                     not null default 0,
  sources_failed    integer                     not null default 0,
  items_collected   integer                     not null default 0,
  items_new         integer                     not null default 0,
  items_duplicated  integer                     not null default 0,
  errors            jsonb                       not null default '[]'::jsonb,
  metadata          jsonb,
  created_at        timestamptz                 not null default now()
);

-- Índices
create index idx_collection_runs_started_at
  on public.collection_runs (started_at desc);

create index idx_collection_runs_status
  on public.collection_runs (status);

-- RLS
alter table public.collection_runs enable row level security;

create policy "authenticated_full_access"
  on public.collection_runs
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service_role_full_access"
  on public.collection_runs
  for all
  to service_role
  using (true)
  with check (true);
