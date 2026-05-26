-- Cria uma função alternativa de recuperação sem verificação de role
-- (segura pois só é callable com service_role key via edge function)
CREATE OR REPLACE FUNCTION public.get_secret_value(p_secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault', 'extensions'
AS $$
DECLARE
  v_vault_id       uuid;
  v_encrypted_b64  text;
  v_encryption_key text;
  v_plain          text;
BEGIN
  SELECT vault_secret_id,
         encode(encrypted_value, 'base64')
  INTO v_vault_id, v_encrypted_b64
  FROM public.integration_secrets
  WHERE id = p_secret_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Secret not found: %', p_secret_id;
  END IF;

  -- Tenta Vault primeiro
  IF v_vault_id IS NOT NULL THEN
    BEGIN
      SELECT decrypted_secret INTO v_plain
      FROM vault.decrypted_secrets
      WHERE id = v_vault_id;
      IF v_plain IS NOT NULL THEN
        RETURN v_plain;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- cai no fallback
    END;
  END IF;

  -- Fallback pgcrypto
  IF v_encrypted_b64 IS NOT NULL THEN
    v_encryption_key := COALESCE(
      current_setting('app.encryption_key', true),
      'wolfgang-fallback-key-2026'
    );
    RETURN convert_from(
      decrypt(decode(v_encrypted_b64, 'base64'), v_encryption_key::bytea, 'aes'),
      'UTF8'
    );
  END IF;

  RAISE EXCEPTION 'No stored value found for secret %', p_secret_id;
END;
$$;

-- Garante que apenas service_role executa
REVOKE EXECUTE ON FUNCTION public.get_secret_value(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_secret_value(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_secret_value(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_secret_value(uuid) TO service_role;
