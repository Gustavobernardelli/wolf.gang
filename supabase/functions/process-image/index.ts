import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { downloadImage } from './lib/downloader.ts';
import { hashImage } from './lib/hasher.ts';
import { checkDuplicateAsset } from './lib/deduplicator.ts';
import { optimizeImage } from './lib/optimizer.ts';
import { uploadImage } from './lib/uploader.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { image_url, news_item_id, force_reprocess } = await req.json();

    if (!image_url || typeof image_url !== 'string' || !image_url.startsWith('http')) {
      throw { code: 'INVALID_IMAGE', message: 'Valid image_url is required' };
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Download
    const { buffer: originalBuffer, mimeType: originalMime, sizeBytes: originalSize } = await downloadImage(image_url);

    // 2. Hash
    const hash = await hashImage(originalBuffer);

    // 3. Deduplication check
    if (!force_reprocess) {
      const existingAsset = await checkDuplicateAsset(supabaseClient, hash);
      if (existingAsset) {
        // Link to news_item if provided
        if (news_item_id) {
          await supabaseClient.from('news_items').update({
            image_asset_id: existingAsset.id,
            image_download_status: 'success',
            image_processed_at: new Date().toISOString(),
          }).eq('id', news_item_id);
        }

        return new Response(
          JSON.stringify({
            ok: true,
            deduplicated: true,
            asset: existingAsset,
            processing_time_ms: Date.now() - startTime,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // 4. Optimize
    const { buffer: webpBuffer, width, height, wasResized } = await optimizeImage(originalBuffer, originalMime);

    // 5. Upload
    const { storagePath, existed } = await uploadImage(supabaseClient, hash, webpBuffer);

    // 6. DB Record
    const publicUrl = supabaseClient.storage.from('Midia').getPublicUrl(storagePath).data.publicUrl;
    
    // Check if another concurrent execution inserted the DB record while we were optimizing
    let finalAsset;
    if (existed) {
       finalAsset = await checkDuplicateAsset(supabaseClient, hash);
    }

    if (!finalAsset) {
      const { data: newAsset, error: insertError } = await supabaseClient.from('media_assets').insert({
        hash_sha256: hash,
        storage_path: storagePath,
        public_url: publicUrl,
        original_url: image_url,
        original_mime_type: originalMime,
        original_size_bytes: originalSize,
        processed_mime_type: 'image/webp',
        processed_size_bytes: webpBuffer.byteLength,
        width,
        height,
        was_resized: wasResized,
        processing_metadata: {
          processing_time_ms: Date.now() - startTime,
          library: 'jsquash'
        }
      }).select().single();

      if (insertError) {
        throw { code: 'PROCESSING_FAILED', message: `DB insert error: ${insertError.message}` };
      }
      finalAsset = newAsset;
    }

    // 7. Link to news_item
    if (news_item_id) {
      await supabaseClient.from('news_items').update({
        image_asset_id: finalAsset.id,
        image_download_status: 'success',
        image_processed_at: new Date().toISOString(),
      }).eq('id', news_item_id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deduplicated: false,
        asset: finalAsset,
        processing_time_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Process image error:', error);
    const errCode = error.code || 'PROCESSING_FAILED';
    const errMessage = error.message || String(error);

    // try to update news_item if it failed
    try {
      const reqClone = await req.clone().json().catch(() => ({}));
      if (reqClone.news_item_id) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        // Increment attempts, set status based on attempts?
        // Let's just fetch current attempts and increment, or use a rpc.
        // For simplicity, just mark failed.
        await supabaseClient.from('news_items').update({
          image_download_status: 'failed',
          image_download_error: errMessage,
          image_processed_at: new Date().toISOString(),
        }).eq('id', reqClone.news_item_id);
      }
    } catch (_) { }

    return new Response(
      JSON.stringify({
        ok: false,
        error_code: errCode,
        error_message: errMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
