import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, token_meta, instagram_id, webhook, channel_id } = body;

    // Ações de verificação de token
    if (action === "verify_meta_token") {
      if (!token_meta) {
        return new Response(JSON.stringify({ ok: false, error: "Token Meta ausente." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const res = await fetch(`https://graph.facebook.com/v25.0/me?access_token=${token_meta}`);
      const json = await res.json();
      if (json.error) {
        return new Response(JSON.stringify({ ok: false, error: json.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, data: json, message: "Token Meta verificado e válido!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify_webhook") {
      if (!webhook) {
        return new Response(JSON.stringify({ ok: false, error: "Webhook URL ausente." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Faz uma chamada POST para o webhook enviado
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ping",
          message: "Teste de conectividade do News Automation Hub",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ ok: false, error: `O webhook retornou status ${res.status}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ ok: true, message: "Webhook respondeu com sucesso." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "save_connection") {
      if (!channel_id) {
        return new Response(JSON.stringify({ ok: false, error: "ID do canal ausente." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await adminClient
        .from("channels")
        .update({
          token_meta,
          instagram_id,
          webhook,
          webhook_url: webhook,
        })
        .eq("id", channel_id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ ok: true, data, message: "Conexões salvas com sucesso via Edge Function!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: "Ação inválida." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
