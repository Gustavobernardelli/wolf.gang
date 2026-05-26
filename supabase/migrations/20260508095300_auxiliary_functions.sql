-- Migration: funções auxiliares do domínio Wolfgang

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. compute_external_id
-- Gera SHA-256 hex do GUID (se existir) ou do link.
-- Garante deduplicação mesmo que o link mude ligeiramente entre coletas.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.compute_external_id(
  p_link text,
  p_guid text default null
)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if p_guid is not null and trim(p_guid) <> '' then
    return encode(digest(trim(p_guid), 'sha256'), 'hex');
  else
    return encode(digest(trim(p_link), 'sha256'), 'hex');
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. increment_source_error
-- Incrementa consecutive_errors, registra o erro e auto-desativa após
-- atingir o limite configurado em app_settings.max_consecutive_errors.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.increment_source_error(
  p_source_id  uuid,
  p_error_msg  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_errors integer;
begin
  -- Lê o limite configurado (padrão: 10)
  select coalesce(
    (select value::integer from public.app_settings where key = 'max_consecutive_errors'),
    10
  ) into v_max_errors;

  update public.feed_sources
  set
    consecutive_errors = consecutive_errors + 1,
    last_error         = p_error_msg,
    last_fetched_at    = now(),
    -- Auto-desativa se atingir o limite
    active = case
               when consecutive_errors + 1 >= v_max_errors then false
               else active
             end,
    updated_at = now()
  where id = p_source_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. reset_source_errors
-- Zera contadores de erro após coleta bem-sucedida.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.reset_source_errors(
  p_source_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.feed_sources
  set
    consecutive_errors = 0,
    last_error         = null,
    last_fetched_at    = now(),
    last_success_at    = now(),
    updated_at         = now()
  where id = p_source_id;
end;
$$;
