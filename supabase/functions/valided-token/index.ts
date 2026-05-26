import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, platform = "instagram" } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, error: "Token ausente no corpo da requisição." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (platform === "meta_instagram_id") {
      const url = `https://graph.facebook.com/v25.0/me/instagram_accounts?access_token=${token}`;
      
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        return new Response(
          JSON.stringify({ ok: false, error: json.error?.message || "Erro ao buscar contas do Instagram na API da Meta." }),
          { status: res.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          data: json,
          message: "Contas do Instagram obtidas com sucesso!"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // Caso padrão: Validar Token Meta via Facebook /me
      const url = `https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${token}`;
      
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        return new Response(
          JSON.stringify({ ok: false, error: json.error?.message || "Erro ao validar Token Meta na API do Facebook." }),
          { status: res.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          data: json,
          message: `Token Meta validado! Perfil: ${json.name}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
