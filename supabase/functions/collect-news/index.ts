import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CollectRequest {
  feed_source_id: string;
}

// Reuse parsing logic from validate-rss-feed
function getXmlText(xml: string, tag: string): string | null {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  ];
  for (const p of patterns) {
    const m = xml.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function getXmlAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

function parseRssItem(itemXml: string) {
  const title = getXmlText(itemXml, "title");
  const link = getXmlText(itemXml, "link") || getXmlAttr(itemXml, "link", "href");
  const description = getXmlText(itemXml, "description");
  const pubDate = getXmlText(itemXml, "pubDate") || getXmlText(itemXml, "dc:date") || getXmlText(itemXml, "published");
  const author = getXmlText(itemXml, "author") || getXmlText(itemXml, "dc:creator");
  const guid = getXmlText(itemXml, "guid");

  const catRe = /<category[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/gi;
  const categories: string[] = [];
  let cm;
  while ((cm = catRe.exec(itemXml)) !== null) categories.push(cm[1].trim());

  let imageUrl: string | null = null;
  let imageSource: string | null = null;

  const mediaUrl = getXmlAttr(itemXml, "media:content", "url") || getXmlAttr(itemXml, "media:thumbnail", "url");
  if (mediaUrl) { imageUrl = mediaUrl; imageSource = "media_content"; }
  if (!imageUrl) {
    const encType = getXmlAttr(itemXml, "enclosure", "type") || "";
    if (encType.startsWith("image/")) {
      imageUrl = getXmlAttr(itemXml, "enclosure", "url");
      imageSource = "enclosure";
    }
  }
  if (!imageUrl && description) {
    const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) { imageUrl = imgMatch[1]; imageSource = "html_parse"; }
  }

  return { title, link, description, pubDate, author, categories, imageUrl, imageSource, guid };
}

function parseDate(raw: string | null): string {
  if (!raw) return new Date().toISOString();
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { feed_source_id }: CollectRequest = await req.json();
    if (!feed_source_id) throw new Error("feed_source_id is required");

    // 1. Fetch Source
    const { data: source, error: sourceErr } = await supabase
      .from("feed_sources")
      .select("*")
      .eq("id", feed_source_id)
      .single();

    if (sourceErr || !source) throw new Error("Source not found");

    // 2. Log Start
    const { data: run, error: runErr } = await supabase
      .from("collection_runs")
      .insert({
        triggered_by: "manual",
        status: "running",
        sources_total: 1,
      })
      .select()
      .single();

    if (runErr) throw runErr;

    // 3. Fetch & Parse RSS
    const response = await fetch(source.feed_url, {
      headers: { "User-Agent": "Wolfgang/1.0 (+News-Collector)" },
    });
    
    // Handle charset (copying logic from validator)
    const rawBytes = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "";
    const charsetMatch = contentType.match(/charset=([\w-]+)/i)?.[1];
    const charset = charsetMatch ?? "utf-8";
    const rawText = new TextDecoder(charset, { fatal: false }).decode(rawBytes);

    const itemBlocks: string[] = [];
    const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
    let m;
    while ((m = itemRe.exec(rawText)) !== null) itemBlocks.push(m[0]);
    if (itemBlocks.length === 0) {
      const entryRe = /<entry[\s>][\s\S]*?<\/entry>/gi;
      while ((m = entryRe.exec(rawText)) !== null) itemBlocks.push(m[0]);
    }

    const parsedItems = itemBlocks.map(parseRssItem);
    
    // 4. Batch Process Items
    let itemsNew = 0;
    let itemsDuplicated = 0;

    for (const item of parsedItems) {
      if (!item.title || !item.link) continue;

      // Compute external_id (calling the DB function via RPC is cleaner but we can do it here)
      // Actually, let's use the DB function if possible, or just SHA-256 here.
      // Migration 095300 has public.compute_external_id.
      const { data: externalId } = await supabase.rpc('compute_external_id', { 
        p_link: item.link, 
        p_guid: item.guid 
      });

      const newsItem = {
        source_id: source.id,
        external_id: externalId,
        guid: item.guid,
        title: item.title,
        description: item.description ? item.description.replace(/<[^>]*>/g, "").trim() : null,
        description_html: item.description,
        link: item.link,
        image_url: item.imageUrl,
        image_source_field: item.imageSource,
        author: item.author,
        categories: item.categories,
        portal: source.portal,
        published_at: parseDate(item.pubDate),
        raw_data: item,
        status: 'new'
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("news_items")
        .upsert(newsItem, { onConflict: "link", ignoreDuplicates: true })
        .select("id")
        .maybeSingle();

      if (insertErr) {
        console.error(`Error inserting ${item.link}:`, insertErr);
        continue;
      }

      if (inserted) {
        itemsNew++;
        // 5. Link to Run
        await supabase.from("collection_run_items").insert({
          run_id: run.id,
          news_item_id: inserted.id,
          was_new: true
        });

        // 6. Trigger Image Processing (Async)
        if (item.imageUrl) {
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-image`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              image_url: item.imageUrl,
              news_item_id: inserted.id
            })
          }).catch(err => console.error("Process image trigger failed:", err));
        }
      } else {
        itemsDuplicated++;
      }
    }

    // 7. Finalize Run
    await supabase.from("collection_runs").update({
      status: "success",
      finished_at: new Date().toISOString(),
      sources_success: 1,
      items_collected: parsedItems.length,
      items_new: itemsNew,
      items_duplicated: itemsDuplicated
    }).eq("id", run.id);

    await supabase.from("feed_sources").update({
      last_success_at: new Date().toISOString(),
      last_fetched_at: new Date().toISOString(),
      consecutive_errors: 0
    }).eq("id", source.id);

    return new Response(JSON.stringify({ 
      ok: true, 
      items_collected: parsedItems.length,
      items_new: itemsNew,
      items_duplicated: itemsDuplicated
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Collection error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
