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
    const {
      edition_id,
      news_item_id,
      channel_id,
      channel_name,
      destination_column,
      destination_label,
      title,
      subtitle,
      subtitle_visible,
      description,
      image_url,
      crop_settings,
      status = "pendente",
    } = body;

    if (!edition_id || !channel_id || !destination_column) {
      return new Response(
        JSON.stringify({ ok: false, error: "Parâmetros obrigatórios ausentes (edition_id, channel_id, destination_column)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Puxa as informações do canal na tabela channels com as novas colunas
    const { data: channel, error: channelError } = await adminClient
      .from("channels")
      .select("token_meta, instagram_id, webhook")
      .eq("id", channel_id)
      .single();

    if (channelError) {
      return new Response(
        JSON.stringify({ ok: false, error: `Erro ao buscar canal: ${channelError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token_meta = channel?.token_meta || null;
    const instagram_id = channel?.instagram_id || null;
    const webhook = channel?.webhook || null;

    // 2. Salva/Upserta na tabela scheduled_posts
    const { data, error: upsertError } = await adminClient
      .from("scheduled_posts")
      .upsert(
        {
          edition_id,
          news_item_id,
          channel_id,
          channel_name,
          destination_column,
          destination_label,
          title,
          subtitle,
          subtitle_visible,
          description,
          image_url,
          crop_settings,
          status,
          token_meta,
          instagram_id,
          webhook,
        },
        { onConflict: "edition_id,channel_id,destination_column" }
      )
      .select()
      .single();

    if (upsertError) {
      return new Response(
        JSON.stringify({ ok: false, error: `Erro ao salvar agendamento: ${upsertError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, data, message: "Postagem salva e agendada com sucesso!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
