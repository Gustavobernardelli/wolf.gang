-- Migration: tabela integration_secrets
-- Armazena metadados de credenciais. Valor real fica no Vault.

create table public.integration_secrets (
  id                  uuid                           primary key default gen_random_uuid(),
  name                text                           not null,
  provider            text                           not null,
  kind                public.secret_kind             not null,
  vault_secret_id     uuid,           -- FK lógica pro Vault (não enforced via constraint)
  encrypted_value     bytea,          -- fallback pgcrypto se Vault indisponível
  value_preview       text            not null,
  value_hash          text            not null,
  metadata            jsonb           not null default '{}'::jsonb,
  description         text,
  active              boolean         not null default true,
  last_used_at        timestamptz,
  last_validated_at   timestamptz,
  validation_status   public.secret_validation_status not null default 'unchecked',
  validation_message  text,
  expires_at          timestamptz,
  created_at          timestamptz     not null default now(),
  updated_at          timestamptz     not null default now(),

  constraint uq_secret_provider_name unique (provider, name)
);

-- Trigger de updated_at
create trigger integration_secrets_updated_at
  before update on public.integration_secrets
  for each row execute function public.update_updated_at();

-- Índices
create index idx_integration_secrets_provider_active
  on public.integration_secrets (provider, active);

create index idx_integration_secrets_kind
  on public.integration_secrets (kind);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.integration_secrets enable row level security;

-- service_role tem acesso total (Edge Functions)
create policy "service_role_full_access"
  on public.integration_secrets
  for all
  to service_role
  using (true)
  with check (true);

-- authenticated pode INSERT/UPDATE/DELETE mas SELECT é via view (abaixo)
create policy "authenticated_write"
  on public.integration_secrets
  for insert
  to authenticated
  with check (true);

create policy "authenticated_update"
  on public.integration_secrets
  for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_delete"
  on public.integration_secrets
  for delete
  to authenticated
  using (true);

-- authenticated NÃO tem política de SELECT na tabela base.
-- O SELECT é feito exclusivamente via view integration_secrets_safe abaixo.

-- ── View segura (exclui colunas sensíveis) ───────────────────────────────────
create view public.integration_secrets_safe
  with (security_invoker = true)
as
  select
    id,
    name,
    provider,
    kind,
    value_preview,
    value_hash,
    metadata,
    description,
    active,
    last_used_at,
    last_validated_at,
    validation_status,
    validation_message,
    expires_at,
    created_at,
    updated_at
  from public.integration_secrets;

-- Concede SELECT na view ao authenticated
grant select on public.integration_secrets_safe to authenticated;
