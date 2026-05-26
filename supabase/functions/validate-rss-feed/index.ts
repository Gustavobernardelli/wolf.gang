import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidationRequest {
  feed_source_id?: string;
  url?: string;
}

interface SchemaCheck {
  estimated_compatibility: "full" | "partial" | "poor";
  fields_present: string[];
  fields_missing: string[];
  image_extraction_strategy: "media_content" | "enclosure" | "html_parse" | "none";
  warnings: string[];
}

interface SampleItem {
  title: string;
  link: string;
  image_url: string | null;
  published_at: string | null;
}

// Extract text content from XML element
function getXmlText(xml: string, tag: string): string | null {
  // Handle namespaced tags
  const escaped = tag.replace(":", "\\:").replace(".", "\\.");
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

// Strip HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Parse a single RSS item block
function parseRssItem(itemXml: string): {
  title: string | null;
  link: string | null;
  description: string | null;
  pubDate: string | null;
  author: string | null;
  categories: string[];
  imageUrl: string | null;
  imageSource: "media_content" | "enclosure" | "html_parse" | null;
  guid: string | null;
} {
  const title = getXmlText(itemXml, "title");
  const link = getXmlText(itemXml, "link") || getXmlAttr(itemXml, "link", "href");
  const description = getXmlText(itemXml, "description");
  const pubDate = getXmlText(itemXml, "pubDate") || getXmlText(itemXml, "dc:date") ||
    getXmlText(itemXml, "published");
  const author = getXmlText(itemXml, "author") || getXmlText(itemXml, "dc:creator");
  const guid = getXmlText(itemXml, "guid");

  // Categories
  const catRe = /<category[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/gi;
  const categories: string[] = [];
  let cm;
  while ((cm = catRe.exec(itemXml)) !== null) categories.push(cm[1].trim());

  // Image extraction cascade
  let imageUrl: string | null = null;
  let imageSource: "media_content" | "enclosure" | "html_parse" | null = null;

  // 1. media:content
  const mediaUrl = getXmlAttr(itemXml, "media:content", "url") ||
    getXmlAttr(itemXml, "media:thumbnail", "url");
  if (mediaUrl) {
    imageUrl = mediaUrl;
    imageSource = "media_content";
  }

  // 2. enclosure
  if (!imageUrl) {
    const encType = getXmlAttr(itemXml, "enclosure", "type") || "";
    if (encType.startsWith("image/")) {
      const encUrl = getXmlAttr(itemXml, "enclosure", "url");
      if (encUrl) {
        imageUrl = encUrl;
        imageSource = "enclosure";
      }
    }
  }

  // 3. img tag in description HTML (double or single quotes)
  if (!imageUrl && description) {
    const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
      imageUrl = imgMatch[1];
      imageSource = "html_parse";
    }
  }

  return { title, link, description, pubDate, author, categories, imageUrl, imageSource, guid };
}

const PT_MONTHS: Record<string, string> = {
  'jan': 'Jan', 'fev': 'Feb', 'mar': 'Mar', 'abr': 'Apr',
  'mai': 'May', 'jun': 'Jun', 'jul': 'Jul', 'ago': 'Aug',
  'set': 'Sep', 'out': 'Oct', 'nov': 'Nov', 'dez': 'Dec',
};
const PT_DAYS: Record<string, string> = {
  'seg': 'Mon', 'ter': 'Tue', 'qua': 'Wed', 'qui': 'Thu',
  'sex': 'Fri', 'sáb': 'Sat', 'sab': 'Sat', 'dom': 'Sun',
};

function normalizePtDate(raw: string): string {
  // Replace Portuguese day abbreviations (e.g. "Sex," → "Fri,")
  let s = raw.replace(/^([A-Za-záéíóúàãõâê]{3}),/i, (_, d) => {
    const key = d.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (PT_DAYS[key] ?? d) + ',';
  });
  // Replace Portuguese month abbreviations (e.g. "Mai" → "May")
  s = s.replace(/\b([A-Za-záéíóúàãõâê]{3})\b/gi, (m) => {
    const key = m.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return PT_MONTHS[key] ?? m;
  });
  return s;
}

// Parse date and convert to ISO UTC
function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  try {
    let d = new Date(raw);
    if (isNaN(d.getTime())) {
      d = new Date(normalizePtDate(raw));
    }
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

// Run schema compatibility check
function checkSchemaCompatibility(items: ReturnType<typeof parseRssItem>[]): SchemaCheck {
  if (items.length === 0) {
    return {
      estimated_compatibility: "poor",
      fields_present: [],
      fields_missing: ["title", "link", "published_at", "description", "image_url", "author", "categories"],
      image_extraction_strategy: "none",
      warnings: ["Nenhum item encontrado no feed"],
    };
  }

  const sample = items.slice(0, 5);
  const count = sample.length;
  const warnings: string[] = [];

  const has = (fn: (i: ReturnType<typeof parseRssItem>) => boolean) =>
    sample.filter(fn).length / count >= 0.8;

  const hasTitle = has((i) => !!i.title);
  const hasLink = has((i) => !!i.link);
  const hasPubDate = has((i) => !!parseDate(i.pubDate));
  const hasDescription = has((i) => !!i.description);
  const hasImage = has((i) => !!i.imageUrl);
  const hasAuthor = has((i) => !!i.author);
  const hasCategories = has((i) => i.categories.length > 0);

  const present: string[] = [];
  const missing: string[] = [];

  if (hasTitle) present.push("title"); else missing.push("title");
  if (hasLink) present.push("link"); else missing.push("link");
  if (hasPubDate) present.push("published_at"); else { missing.push("published_at"); warnings.push("Menos de 80% dos itens possuem data válida"); }
  if (hasDescription) present.push("description"); else missing.push("description");
  if (hasImage) present.push("image_url"); else { missing.push("image_url"); warnings.push("Imagens não detectadas — geração de arte pode ser limitada"); }
  if (hasAuthor) present.push("author"); else missing.push("author");
  if (hasCategories) present.push("categories"); else missing.push("categories");

  // Detect image strategy
  const strategies = sample.map((i) => i.imageSource);
  let imageStrategy: SchemaCheck["image_extraction_strategy"] = "none";
  if (strategies.includes("media_content")) imageStrategy = "media_content";
  else if (strategies.includes("enclosure")) imageStrategy = "enclosure";
  else if (strategies.includes("html_parse")) imageStrategy = "html_parse";

  // Date timezone warnings
  const rawDates = sample.filter((i) => i.pubDate).map((i) => i.pubDate!);
  const hasBRT = rawDates.some((d) => d.includes("-03:00") || d.includes("BRT") || d.includes("GMT-3"));
  if (hasBRT) warnings.push("Datas detectadas em BRT — serão convertidas para UTC automaticamente");

  // Compatibility score
  const required = [hasTitle, hasLink, hasPubDate];
  const important = [hasDescription, hasImage];
  const allRequired = required.every(Boolean);
  const someImportant = important.filter(Boolean).length >= 1;

  let compatibility: SchemaCheck["estimated_compatibility"];
  if (allRequired && someImportant && present.length >= 5) compatibility = "full";
  else if (allRequired) compatibility = "partial";
  else compatibility = "poor";

  return {
    estimated_compatibility: compatibility,
    fields_present: present,
    fields_missing: missing,
    image_extraction_strategy: imageStrategy,
    warnings,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body: ValidationRequest = await req.json();
    let targetUrl: string;
    let feedSourceId: string | null = null;

    // Resolve URL
    if (body.feed_source_id) {
      const { data, error } = await supabase
        .from("feed_sources")
        .select("id, feed_url")
        .eq("id", body.feed_source_id)
        .single();
      if (error || !data) {
        return Response.json({ ok: false, error_code: "source_not_found", error_message: "Fonte RSS não encontrada" }, { headers: corsHeaders });
      }
      targetUrl = data.feed_url;
      feedSourceId = data.id;
    } else if (body.url) {
      targetUrl = body.url;
    } else {
      return Response.json({ ok: false, error_code: "missing_params", error_message: "Informe feed_source_id ou url" }, { headers: corsHeaders, status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Protocol inválido");
    } catch {
      return Response.json({ ok: false, error_code: "invalid_url", error_message: "URL inválida" }, { headers: corsHeaders });
    }

    // Fetch RSS
    const startMs = Date.now();
    let response: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      response = await fetch(targetUrl, {
        headers: { "User-Agent": "Wolfgang/1.0 (+RSS-Validator)" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro de rede";
      const errCode = msg.includes("aborted") ? "timeout" : "network_error";
      const logStatus: "failed" = "failed";
      if (feedSourceId) {
        await supabase.from("feed_validation_logs").insert({
          feed_source_id: feedSourceId, status: logStatus, error_message: msg,
          schema_check: {}, triggered_by: "manual",
        });
      }
      return Response.json({ ok: false, error_code: errCode, error_message: msg }, { headers: corsHeaders });
    }

    const responseTimeMs = Date.now() - startMs;
    const httpStatus = response.status;

    if (httpStatus >= 400) {
      const errMsg = `HTTP ${httpStatus}: ${response.statusText}`;
      if (feedSourceId) {
        await supabase.from("feed_validation_logs").insert({
          feed_source_id: feedSourceId, status: "failed", http_status: httpStatus,
          response_time_ms: responseTimeMs, error_message: errMsg, schema_check: {},
        });
      }
      return Response.json({ ok: false, error_code: "http_error", error_message: errMsg, http_status: httpStatus }, { headers: corsHeaders });
    }

    // Get XML text — detect charset (UOL and others serve ISO-8859-1)
    const rawBytes = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "";
    const charsetFromHeader = contentType.match(/charset=([\w-]+)/i)?.[1];
    // Peek at first 200 bytes with ASCII to find XML encoding declaration
    const peek = new TextDecoder("ascii", { fatal: false }).decode(new Uint8Array(rawBytes, 0, 200));
    const charsetFromXml = peek.match(/encoding=["']([\w-]+)["']/i)?.[1];
    const charset = charsetFromHeader ?? charsetFromXml ?? "utf-8";
    const rawText = new TextDecoder(charset, { fatal: false }).decode(rawBytes);

    // Extract feed metadata
    const feedTitle = getXmlText(rawText, "title") || "Sem título";
    const feedLanguage = getXmlText(rawText, "language") || "desconhecido";

    // Split items
    const itemBlocks: string[] = [];
    const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
    let m;
    while ((m = itemRe.exec(rawText)) !== null) itemBlocks.push(m[0]);

    // Also try <entry> (Atom feeds)
    if (itemBlocks.length === 0) {
      const entryRe = /<entry[\s>][\s\S]*?<\/entry>/gi;
      while ((m = entryRe.exec(rawText)) !== null) itemBlocks.push(m[0]);
    }

    const parsedItems = itemBlocks.map(parseRssItem);
    const schemaCheck = checkSchemaCompatibility(parsedItems);

    // Build sample (first 3)
    const sample: SampleItem[] = parsedItems.slice(0, 3).map((i) => ({
      title: i.title || "",
      link: i.link || "",
      image_url: i.imageUrl,
      published_at: parseDate(i.pubDate),
    }));

    const sampleTitles = sample.map((s) => s.title).filter(Boolean);
    const itemsWithImage = parsedItems.filter((i) => i.imageUrl).length;
    const itemsWithPubdate = parsedItems.filter((i) => parseDate(i.pubDate)).length;

    const resultStatus: "success" | "partial" | "failed" =
      schemaCheck.estimated_compatibility === "full" ? "success" :
      schemaCheck.estimated_compatibility === "partial" ? "partial" : "failed";

    // Persist log if feed_source_id provided
    if (feedSourceId) {
      await supabase.from("feed_validation_logs").insert({
        feed_source_id: feedSourceId,
        triggered_by: "manual",
        status: resultStatus,
        http_status: httpStatus,
        response_time_ms: responseTimeMs,
        items_found: parsedItems.length,
        items_with_image: itemsWithImage,
        items_with_pubdate: itemsWithPubdate,
        sample_titles: sampleTitles,
        schema_check: schemaCheck,
        raw_sample: parsedItems.length > 0 ? parsedItems[0] : null,
      });

      await supabase.from("feed_sources").update({ last_fetched_at: new Date().toISOString() })
        .eq("id", feedSourceId);
    }

    return Response.json({
      ok: true,
      http_status: httpStatus,
      response_time_ms: responseTimeMs,
      feed_meta: {
        title: feedTitle,
        language: feedLanguage,
        items_count: parsedItems.length,
      },
      schema_check: schemaCheck,
      sample,
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return Response.json({ ok: false, error_code: "internal_error", error_message: msg }, { headers: corsHeaders, status: 500 });
  }
});
