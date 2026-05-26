import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "create" | "update_value" | "update_meta" | "delete" | "test" | "get_plain_value" | "list_models";

// Mask preview: primeiros 7 + **** + últimos 4
function maskSecret(value: string): string {
  if (!value) return "****";
  if (value.length <= 8) return value.slice(0, 2) + "*".repeat(value.length - 2);
  return value.slice(0, 7) + "****" + value.slice(-4);
}

// SHA-256 hex
async function hashSecret(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Provider-specific test handlers
async function testProvider(provider: string, value: string): Promise<{
  ok: boolean;
  message: string;
  tested: boolean;
  http_status?: number;
}> {
  try {
    switch (provider) {
      case "openai": {
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${value}` },
          signal: AbortSignal.timeout(10000),
        });
        return { ok: r.ok, tested: true, http_status: r.status, message: r.ok ? "API key válida" : `Inválida (HTTP ${r.status})` };
      }
      case "anthropic": {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": value, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
          signal: AbortSignal.timeout(10000),
        });
        // 200 = ok, 400 = key ok but bad request, 401 = invalid
        const ok = [200, 400].includes(r.status);
        return { ok, tested: true, http_status: r.status, message: ok ? "API key válida" : `Inválida (HTTP ${r.status})` };
      }
      case "meta_graph": {
        const r = await fetch(`https://graph.facebook.com/me?access_token=${value}`, {
          signal: AbortSignal.timeout(10000),
        });
        const data = await r.json();
        return { ok: r.ok && !data.error, tested: true, http_status: r.status, message: r.ok && !data.error ? `Token válido: ${data.name || "OK"}` : (data.error?.message || `Inválido (HTTP ${r.status})`) };
      }
      case "bannerbear": {
        const r = await fetch("https://api.bannerbear.com/v2/auth", {
          headers: { Authorization: `Bearer ${value}` },
          signal: AbortSignal.timeout(10000),
        });
        return { ok: r.ok, tested: true, http_status: r.status, message: r.ok ? "API key válida" : `Inválida (HTTP ${r.status})` };
      }
      case "google":
      case "custom": {
        // Valida chave Google Gemini listando modelos
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${value}`,
          { signal: AbortSignal.timeout(10000) }
        );
        return {
          ok: r.ok,
          tested: true,
          http_status: r.status,
          message: r.ok ? "Chave Google Gemini válida" : `Inválida (HTTP ${r.status})`,
        };
      }
      case "wordpress": {
        return { ok: true, tested: false, message: "Teste de WordPress requer URL do site — use Testar com configurações" };
      }
      case "custom_webhook": {
        const r = await fetch(value.startsWith("http") ? value : `https://${value}`, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        });
        return { ok: r.status < 500, tested: true, http_status: r.status, message: `Respondeu HTTP ${r.status}` };
      }
      default:
        // Providers sem handler: não falha, apenas marca como não testado
        return { ok: true, tested: false, message: `Provider '${provider}' sem handler de teste automático` };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro de rede";
    return { ok: false, tested: true, message: msg };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const action: Action = body.action;

    // ── CREATE ───────────────────────────────────────────────────────────────
    if (action === "create") {
      const { name, provider, kind, value, metadata, description } = body;
      if (!name || !provider || !kind || !value) {
        return Response.json({ ok: false, error: "name, provider, kind e value são obrigatórios" }, { headers: corsHeaders, status: 400 });
      }
      if (value.length < 8) {
        return Response.json({ ok: false, error: "O valor do secret deve ter no mínimo 8 caracteres" }, { headers: corsHeaders, status: 400 });
      }

      // Check duplicates by (provider, name)
      const { data: existing } = await supabase.from("integration_secrets")
        .select("id").eq("provider", provider).eq("name", name).single();
      if (existing) {
        return Response.json({ ok: false, error: `Já existe uma credencial '${name}' para o provider '${provider}'` }, { headers: corsHeaders, status: 409 });
      }

      const preview = maskSecret(value);
      const hash = await hashSecret(value);

      // Store in Vault via RPC
      const { data: storeResult, error: storeErr } = await supabase.rpc("vault_store_secret", {
        p_name: `${provider}:${name}`,
        p_secret: value,
      });

      let vaultId: string | null = null;
      let encryptedB64: string | null = null;
      if (!storeErr && storeResult) {
        vaultId = storeResult.vault_id || null;
        encryptedB64 = storeResult.encrypted || null;
      }

      const insertData: Record<string, unknown> = {
        name, provider, kind,
        value_preview: preview,
        value_hash: hash,
        metadata: metadata || {},
        description: description || null,
        active: true,
        validation_status: "unchecked",
      };
      if (vaultId) insertData.vault_secret_id = vaultId;
      // encryptedB64 é uma string base64 — armazenamos via SQL decode() para bytea
      if (encryptedB64) {
        // O campo é bytea: precisamos passar como \x<hex> literal ou decodificar via RPC
        // Salvamos como texto base64 no campo text-compatible via cast no insert raw
        insertData.encrypted_value = Buffer.from(encryptedB64, 'base64');
      }

      const { data: secret, error: insertErr } = await supabase
        .from("integration_secrets")
        .insert(insertData)
        .select("id, name, provider, kind, value_preview, metadata, description, active, validation_status, created_at")
        .single();

      if (insertErr) return Response.json({ ok: false, error: insertErr.message }, { headers: corsHeaders, status: 500 });

      // Optionally auto-test
      if (body.test_on_create) {
        const testResult = await testProvider(provider, value);
        const newStatus = testResult.ok ? "valid" : "invalid";
        await supabase.from("integration_secrets").update({
          validation_status: newStatus,
          validation_message: testResult.message,
          last_validated_at: new Date().toISOString(),
        }).eq("id", secret!.id);
        return Response.json({ ok: true, secret: { ...secret, validation_status: newStatus, validation_message: testResult.message }, test_result: testResult }, { headers: corsHeaders });
      }

      return Response.json({ ok: true, secret }, { headers: corsHeaders });
    }

    // ── UPDATE VALUE ─────────────────────────────────────────────────────────
    if (action === "update_value") {
      const { id, value } = body;
      if (!id || !value) return Response.json({ ok: false, error: "id e value obrigatórios" }, { headers: corsHeaders, status: 400 });
      if (value.length < 8) return Response.json({ ok: false, error: "Mínimo 8 caracteres" }, { headers: corsHeaders, status: 400 });

      const { data: existing } = await supabase.from("integration_secrets").select("provider, name").eq("id", id).single();
      if (!existing) return Response.json({ ok: false, error: "Secret não encontrado" }, { headers: corsHeaders, status: 404 });

      const preview = maskSecret(value);
      const hash = await hashSecret(value);

      const { data: storeResult } = await supabase.rpc("vault_store_secret", {
        p_name: `${existing.provider}:${existing.name}:rotated:${Date.now()}`,
        p_secret: value,
      });

      const updateData: Record<string, unknown> = {
        value_preview: preview,
        value_hash: hash,
        validation_status: "unchecked",
        validation_message: null,
        last_validated_at: null,
      };
      if (storeResult?.vault_id) updateData.vault_secret_id = storeResult.vault_id;
      if (storeResult?.encrypted) {
        updateData.encrypted_value = Buffer.from(storeResult.encrypted as string, 'base64');
      }

      const { error } = await supabase.from("integration_secrets").update(updateData).eq("id", id);
      if (error) return Response.json({ ok: false, error: error.message }, { headers: corsHeaders, status: 500 });
      return Response.json({ ok: true, preview }, { headers: corsHeaders });
    }

    // ── UPDATE META ──────────────────────────────────────────────────────────
    if (action === "update_meta") {
      const { id, name, description, active, metadata } = body;
      if (!id) return Response.json({ ok: false, error: "id obrigatório" }, { headers: corsHeaders, status: 400 });
      const update: Record<string, unknown> = {};
      if (name !== undefined) update.name = name;
      if (description !== undefined) update.description = description;
      if (active !== undefined) update.active = active;
      if (metadata !== undefined) update.metadata = metadata;
      const { error } = await supabase.from("integration_secrets").update(update).eq("id", id);
      if (error) return Response.json({ ok: false, error: error.message }, { headers: corsHeaders, status: 500 });
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (action === "delete") {
      const { id, hard } = body;
      if (!id) return Response.json({ ok: false, error: "id obrigatório" }, { headers: corsHeaders, status: 400 });
      if (hard === true) {
        const { error } = await supabase.from("integration_secrets").delete().eq("id", id);
        if (error) return Response.json({ ok: false, error: error.message }, { headers: corsHeaders, status: 500 });
        return Response.json({ ok: true, deleted: true }, { headers: corsHeaders });
      }
      const { error } = await supabase.from("integration_secrets").update({ active: false }).eq("id", id);
      if (error) return Response.json({ ok: false, error: error.message }, { headers: corsHeaders, status: 500 });
      return Response.json({ ok: true, deactivated: true }, { headers: corsHeaders });
    }

    // ── TEST ─────────────────────────────────────────────────────────────────
    if (action === "test") {
      const { id } = body;
      if (!id) return Response.json({ ok: false, error: "id obrigatório" }, { headers: corsHeaders, status: 400 });

      const { data: secret } = await supabase.from("integration_secrets")
        .select("id, provider, vault_secret_id").eq("id", id).single();
      if (!secret) return Response.json({ ok: false, error: "Secret não encontrado" }, { headers: corsHeaders, status: 404 });

      // Retrieve value via RPC
      const { data: plainText, error: retrieveErr } = await supabase.rpc("get_secret_value", { p_secret_id: id });
      if (retrieveErr || !plainText) {
        return Response.json({ ok: false, error: "Não foi possível recuperar o valor do secret" }, { headers: corsHeaders, status: 500 });
      }

      const testResult = await testProvider(secret.provider, plainText);
      const newStatus = testResult.ok ? "valid" : "invalid";

      await supabase.from("integration_secrets").update({
        validation_status: newStatus,
        validation_message: testResult.message,
        last_validated_at: new Date().toISOString(),
      }).eq("id", id);

      return Response.json({ ok: true, validation_status: newStatus, ...testResult }, { headers: corsHeaders });
    }

    // ── GET PLAIN VALUE (used by generate-ai-content) ──────────────────────────────
    if (action === "get_plain_value") {
      const { id } = body;
      if (!id) return Response.json({ ok: false, error: "id obrigatório" }, { headers: corsHeaders, status: 400 });

      const { data: plainText, error: retrieveErr } = await supabase.rpc("vault_retrieve_secret", { p_secret_id: id });
      if (retrieveErr || !plainText) {
        return Response.json({ ok: false, error: retrieveErr?.message ?? "Valor não encontrado no Vault" }, { headers: corsHeaders, status: 500 });
      }
      return Response.json({ ok: true, value: plainText }, { headers: corsHeaders });
    }

    // ── LIST MODELS ────────────────────────────────────────────────
    if (action === "list_models") {
      const { id } = body;
      if (!id) return Response.json({ ok: false, error: "id obrigatório" }, { headers: corsHeaders, status: 400 });

      const { data: secret } = await supabase.from("integration_secrets").select("provider, name").eq("id", id).single();
      const { data: plainText } = await supabase.rpc("vault_retrieve_secret", { p_secret_id: id });
      if (!plainText || !secret) return Response.json({ ok: false, error: "Credencial não encontrada" }, { headers: corsHeaders, status: 404 });

      const models = await getModels(secret.provider, plainText);
      return Response.json({ ok: true, models }, { headers: corsHeaders });
    }

    return Response.json({ ok: false, error: `Ação desconhecida: ${action}` }, { headers: corsHeaders, status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return Response.json({ ok: false, error: msg }, { headers: corsHeaders, status: 500 });
  }
});
