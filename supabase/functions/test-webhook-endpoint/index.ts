import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HMAC-SHA256 signature
async function signPayload(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { webhook_id } = await req.json();
    if (!webhook_id) {
      return Response.json({ ok: false, error: "webhook_id obrigatório" }, { headers: corsHeaders, status: 400 });
    }

    // Fetch webhook config
    const { data: webhook, error: whErr } = await supabase
      .from("webhook_endpoints")
      .select("*, secret_id")
      .eq("id", webhook_id)
      .single();

    if (whErr || !webhook) {
      return Response.json({ ok: false, error: "Webhook não encontrado" }, { headers: corsHeaders, status: 404 });
    }

    if (webhook.direction === "inbound") {
      return Response.json({ ok: false, error: "Não é possível disparar teste em webhooks inbound" }, { headers: corsHeaders, status: 400 });
    }

    // Build test payload
    const testPayload = {
      event: "test",
      timestamp: new Date().toISOString(),
      webhook_id,
      source: "Wolfgang Test",
      payload: {
        message: "Este é um disparo de teste do Wolfgang News Hub.",
        version: "1.0",
      },
    };
    const payloadStr = JSON.stringify(testPayload);

    // Build headers
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Wolfgang/1.0",
      ...(webhook.headers || {}),
    };

    // Add HMAC signature if secret is linked
    if (webhook.secret_id) {
      const { data: plainText } = await supabase.rpc("vault_retrieve_secret", {
        p_secret_id: webhook.secret_id,
      });
      if (plainText && webhook.signature_header) {
        const sig = await signPayload(plainText, payloadStr);
        const algo = webhook.signature_algo || "sha256";
        requestHeaders[webhook.signature_header] = `${algo}=${sig}`;
      }
    }

    // Dispatch
    const startMs = Date.now();
    let lastStatus = 0;
    let responseBody = "";
    try {
      const r = await fetch(webhook.url, {
        method: webhook.method || "POST",
        headers: requestHeaders,
        body: payloadStr,
        signal: AbortSignal.timeout(15000),
      });
      lastStatus = r.status;
      responseBody = await r.text().catch(() => "");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro de rede";
      await supabase.from("webhook_endpoints").update({
        last_triggered_at: new Date().toISOString(),
        last_status: 0,
        failure_count: (webhook.failure_count || 0) + 1,
      }).eq("id", webhook_id);
      return Response.json({ ok: false, error: msg, duration_ms: Date.now() - startMs }, { headers: corsHeaders });
    }

    const durationMs = Date.now() - startMs;
    const ok = lastStatus >= 200 && lastStatus < 300;

    // Update webhook stats
    await supabase.from("webhook_endpoints").update({
      last_triggered_at: new Date().toISOString(),
      last_status: lastStatus,
      failure_count: ok ? 0 : (webhook.failure_count || 0) + 1,
    }).eq("id", webhook_id);

    return Response.json({
      ok,
      http_status: lastStatus,
      duration_ms: durationMs,
      response_preview: responseBody.slice(0, 500),
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return Response.json({ ok: false, error: msg }, { headers: corsHeaders, status: 500 });
  }
});
