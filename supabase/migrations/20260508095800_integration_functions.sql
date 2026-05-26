-- Migration: funções auxiliares de integração de secrets

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. mask_secret — preview seguro do valor
-- Retorna os primeiros 7 chars + '****' + últimos 4 chars
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.mask_secret(value text)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  len integer := length(value);
begin
  if value is null or len = 0 then
    return '****';
  elsif len <= 8 then
    return left(value, 2) || repeat('*', len - 2);
  else
    return left(value, 7) || '****' || right(value, 4);
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. hash_secret — SHA-256 hex do valor para detecção de duplicatas
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.hash_secret(value text)
returns text
language plpgsql
immutable
security definer
set search_path = public, extensions
as $$
begin
  return encode(digest(value, 'sha256'), 'hex');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. vault_store_secret — armazena no Vault ou fallback pgcrypto
-- Tenta vault.create_secret(); se falhar, usa encrypt() do pgcrypto.
-- Retorna: vault_id (uuid or null), encrypted (bytea or null),
--          preview (text), hash (text)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.vault_store_secret(
  p_name   text,
  p_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_vault_id       uuid;
  v_encrypted      bytea;
  v_preview        text;
  v_hash           text;
  v_encryption_key text;
begin
  v_preview := public.mask_secret(p_secret);
  v_hash    := public.hash_secret(p_secret);

  -- Tenta Vault primeiro
  begin
    v_vault_id := vault.create_secret(p_secret, p_name, 'Wolfgang integration secret');
    return jsonb_build_object(
      'vault_id',  v_vault_id,
      'encrypted', null,
      'preview',   v_preview,
      'hash',      v_hash
    );
  exception when others then
    -- Fallback: pgcrypto com chave derivada do nome do projeto
    v_encryption_key := coalesce(
      current_setting('app.encryption_key', true),
      'wolfgang-fallback-key-2026'
    );
    v_encrypted := encrypt(
      p_secret::bytea,
      v_encryption_key::bytea,
      'aes'
    );
    return jsonb_build_object(
      'vault_id',  null,
      'encrypted', encode(v_encrypted, 'base64'),
      'preview',   v_preview,
      'hash',      v_hash
    );
  end;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. vault_retrieve_secret — recupera valor plain-text do Vault
-- APENAS service_role pode chamar esta função.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.vault_retrieve_secret(
  p_secret_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_vault_id       uuid;
  v_encrypted_b64  text;
  v_encryption_key text;
  v_plain          text;
begin
  -- Restringe a service_role
  if current_setting('role') not in ('service_role', 'supabase_admin') then
    raise exception 'Permission denied: vault_retrieve_secret is restricted to service_role';
  end if;

  select vault_secret_id,
         encode(encrypted_value, 'base64')
  into v_vault_id, v_encrypted_b64
  from public.integration_secrets
  where id = p_secret_id;

  if not found then
    raise exception 'Secret not found: %', p_secret_id;
  end if;

  -- Tenta Vault
  if v_vault_id is not null then
    begin
      select decrypted_secret into v_plain
      from vault.decrypted_secrets
      where id = v_vault_id;
      return v_plain;
    exception when others then
      null; -- cai no fallback
    end;
  end if;

  -- Fallback pgcrypto
  if v_encrypted_b64 is not null then
    v_encryption_key := coalesce(
      current_setting('app.encryption_key', true),
      'wolfgang-fallback-key-2026'
    );
    return convert_from(
      decrypt(decode(v_encrypted_b64, 'base64'), v_encryption_key::bytea, 'aes'),
      'UTF8'
    );
  end if;

  raise exception 'No stored value found for secret %', p_secret_id;
end;
$$;

-- Revoga execução de vault_retrieve_secret para authenticated
revoke execute on function public.vault_retrieve_secret(uuid) from authenticated;
revoke execute on function public.vault_retrieve_secret(uuid) from anon;
