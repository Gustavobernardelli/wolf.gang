-- Migration: tabela webhook_endpoints
-- Webhooks que o Wolfgang chama (outbound) ou recebe (inbound).

create table public.webhook_endpoints (
  id                  uuid                      primary key default gen_random_uuid(),
  name                text                      not null,
  direction           public.webhook_direction  not null,
  url                 text                      not null,
  method              text                      not null default 'POST'
                                                check (method in ('GET', 'POST', 'PUT', 'PATCH')),
  event_types         text[],
  headers             jsonb                     not null default '{}'::jsonb,
  secret_id           uuid
                      references public.integration_secrets(id)
                      on delete set null,
  signature_header    text,
  signature_algo      text                      default 'sha256',
  active              boolean                   not null default true,
  last_triggered_at   timestamptz,
  last_status         integer,
  failure_count       integer                   not null default 0,
  created_at          timestamptz               not null default now(),
  updated_at          timestamptz               not null default now()
);

-- Trigger de updated_at
create trigger webhook_endpoints_updated_at
  before update on public.webhook_endpoints
  for each row execute function public.update_updated_at();

-- Índices
create index idx_webhook_endpoints_direction_active
  on public.webhook_endpoints (direction, active);

create index idx_webhook_endpoints_secret_id
  on public.webhook_endpoints (secret_id);

-- GIN em event_types para filtrar por evento
create index idx_webhook_endpoints_event_types
  on public.webhook_endpoints using gin (event_types);

-- RLS
alter table public.webhook_endpoints enable row level security;

create policy "authenticated_full_access"
  on public.webhook_endpoints
  for all
  to authenticated
  using (true)
  with check (true);

create policy "service_role_full_access"
  on public.webhook_endpoints
  for all
  to service_role
  using (true)
  with check (true);
