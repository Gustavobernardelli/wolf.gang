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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { secret_id, prompt } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ ok: false, error: "prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Se vier secret_id, tenta aquele primeiro. Se não vier (ou falhar), busca qualquer ativo.
    let credential: { id: string; name: string; provider: string; metadata: unknown } | null = null;
    let apiKey: string | null = null;

    // Candidatos: o secret_id pedido + qualquer outro ativo com encrypted_value ou vault_secret_id
    const { data: candidates } = await adminClient
      .from("integration_secrets")
      .select("id, name, provider, metadata, vault_secret_id, encrypted_value")
      .eq("active", true)
      .order("created_at", { ascending: false });

    const allCandidates = candidates ?? [];

    // Prioridade: secret_id especificado primeiro, depois qualquer um que tenha dados
    const ordered = secret_id
      ? [
          ...allCandidates.filter((c: any) => c.id === secret_id),
          ...allCandidates.filter((c: any) => c.id !== secret_id),
        ]
      : allCandidates;

    for (const cand of ordered) {
      try {
        const { data: plain, error: vaultErr } = await adminClient.rpc(
          "get_secret_value",
          { p_secret_id: cand.id }
        );
        if (!vaultErr && plain) {
          apiKey = plain as string;
          credential = cand as any;
          break;
        }
      } catch (_) {}
    }

    if (!apiKey || !credential) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Nenhuma chave de API encontrada. Por favor, DELETE e recadastre sua credencial em Integrações — clique no ícone de lixeira e adicione novamente.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Detecta provider e modelo
    const meta = (credential.metadata as Record<string, unknown>) || {};
    const selectedModel = (meta.selected_model as string) || "";
    let provider = credential.provider || "";
    const name = (credential.name || "").toLowerCase();

    // Normaliza provider: custom e google ambos são Google Gemini
    if (provider === "custom" || provider === "") {
      if (name.includes("google") || (apiKey as string).startsWith("AIzaSy")) provider = "google";
      else if (name.includes("openai") || (apiKey as string).startsWith("sk-")) provider = "openai";
      else if (name.includes("anthropic") || name.includes("claude")) provider = "anthropic";
      else provider = "google"; // fallback
    }

    let text = "";

    // 3. Chama o provider
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: selectedModel || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 600,
          temperature: 0.75,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const json = await res.json();
      text = json.choices?.[0]?.message?.content?.trim() ?? "";

    } else if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: selectedModel || "claude-3-haiku-20240307",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
      const json = await res.json();
      text = json.content?.[0]?.text?.trim() ?? "";

    } else {
      // Google Gemini (padrão)
      const modelId = selectedModel || "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (!res.ok) throw new Error(`Google Gemini ${res.status}: ${await res.text()}`);
      const json = await res.json();
      text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    }

    if (!text) throw new Error("O modelo não retornou texto. Tente novamente.");

    return new Response(
      JSON.stringify({ ok: true, text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
