-- Migration: tabela feed_validation_logs
-- Histórico de validações de feeds RSS. Uma linha por execução de "Validar".

create table public.feed_validation_logs (
  id                    uuid                          primary key default gen_random_uuid(),
  feed_source_id        uuid                          not null
                                                      references public.feed_sources(id)
                                                      on delete cascade,
  triggered_by          text                          not null default 'manual'
                                                      check (triggered_by in ('manual', 'auto', 'schedule_test')),
  status                public.feed_validation_result not null,
  http_status           integer,
  response_time_ms      integer,
  items_found           integer                       not null default 0,
  items_with_image      integer                       not null default 0,
  items_with_pubdate    integer                       not null default 0,
  sample_titles         text[],
  schema_check          jsonb                         not null default '{}'::jsonb,
  error_message         text,
  raw_sample            jsonb,
  created_at            timestamptz                   not null default now()
);

-- Índice principal: histórico por feed em ordem cronológica
create index idx_feed_validation_logs_source_date
  on public.feed_validation_logs (feed_source_id, created_at desc);

-- RLS
alter table public.feed_validation_logs enable row level security;

create policy "authenticated_full_access"
  on public.feed_validation_logs
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service_role_full_access"
  on public.feed_validation_logs
  for all
  to service_role
  using (true)
  with check (true);
