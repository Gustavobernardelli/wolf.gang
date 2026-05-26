import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getPngDimensions } from './lib/dimensions.ts';
import { isPngTransparent, isValidPngMime } from './lib/png-validator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashBuffer(buffer: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const publicationSourceId = formData.get('publication_source_id') as string;
    const format = formData.get('format') as string;
    const name = formData.get('name') as string;

    if (!file || !publicationSourceId || !format || !name) {
      throw { code: 'MISSING_FIELDS', message: 'file, publication_source_id, format, and name are required' };
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Basic Validações
    if (file.size > 10 * 1024 * 1024) {
      throw { code: 'TOO_LARGE', message: 'File size exceeds 10MB limit' };
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    // 2. MIME Validation (Magic Bytes)
    if (!isValidPngMime(buffer)) {
      throw { code: 'INVALID_MIME', message: 'File is not a valid PNG image' };
    }

    // 3. Transparency Validation
    if (!isPngTransparent(buffer)) {
      throw { code: 'PNG_NOT_TRANSPARENT', message: 'PNG must have an alpha channel (transparency)' };
    }

    // 4. Dimensions Validation
    const dimensions = getPngDimensions(buffer);
    if (!dimensions) {
      throw { code: 'INVALID_PNG', message: 'Could not extract PNG dimensions' };
    }

    const { data: formatSpec, error: formatError } = await supabaseClient
      .from('mockup_format_specs')
      .select('*')
      .eq('format', format)
      .single();

    if (formatError || !formatSpec) {
      throw { code: 'INVALID_FORMAT', message: `Format ${format} not found in specs` };
    }

    const tolerance = 2;
    const widthDiff = Math.abs(dimensions.width - formatSpec.width);
    const heightDiff = Math.abs(dimensions.height - formatSpec.height);

    if (widthDiff > tolerance || heightDiff > tolerance) {
      throw { 
        code: 'WRONG_DIMENSIONS', 
        message: `Dimensions do not match format ${format}. Expected ${formatSpec.width}x${formatSpec.height}, received ${dimensions.width}x${dimensions.height}`,
        details: { expected: { w: formatSpec.width, h: formatSpec.height }, received: { w: dimensions.width, h: dimensions.height } }
      };
    }

    // 5. Source Validation
    const { data: source, error: sourceError } = await supabaseClient
      .from('publication_sources')
      .select('slug, active')
      .eq('id', publicationSourceId)
      .single();

    if (sourceError || !source) {
      throw { code: 'SOURCE_NOT_FOUND', message: 'Publication source not found' };
    }
    if (!source.active) {
      throw { code: 'SOURCE_INACTIVE', message: 'Publication source is inactive' };
    }

    // 6. Hashing & Deduplication
    const hash = await hashBuffer(buffer);
    const { data: existingAsset } = await supabaseClient
      .from('media_assets')
      .select('*')
      .eq('hash_sha256', hash)
      .single();

    if (existingAsset) {
      return new Response(
        JSON.stringify({ ok: true, asset: existingAsset, deduplicated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 7. Upload to Storage
    const assetId = crypto.randomUUID();
    const storagePath = `Mockups/${source.slug}/${format}/${assetId}.png`;

    const { error: uploadError } = await supabaseClient.storage
      .from('Midia')
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) {
      throw { code: 'UPLOAD_FAILED', message: `Storage upload error: ${uploadError.message}` };
    }

    const publicUrl = supabaseClient.storage.from('Midia').getPublicUrl(storagePath).data.publicUrl;

    // 8. Register in media_assets
    const { data: newAsset, error: insertError } = await supabaseClient
      .from('media_assets')
      .insert({
        id: assetId,
        hash_sha256: hash,
        storage_path: storagePath,
        public_url: publicUrl,
        original_mime_type: 'image/png',
        original_size_bytes: file.size,
        processed_mime_type: 'image/png',
        processed_size_bytes: buffer.byteLength,
        width: dimensions.width,
        height: dimensions.height,
        was_resized: false,
        processing_metadata: {
          uploaded_via: 'upload-mockup-edge-function',
          format_validated: format
        }
      })
      .select()
      .single();

    if (insertError) {
      // Cleanup storage if DB fails
      await supabaseClient.storage.from('Midia').remove([storagePath]);
      throw { code: 'DB_INSERT_FAILED', message: `Database record creation failed: ${insertError.message}` };
    }

    return new Response(
      JSON.stringify({ ok: true, asset: newAsset, deduplicated: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Upload mockup error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error_code: error.code || 'INTERNAL_ERROR',
        error_message: error.message || 'An unexpected error occurred',
        details: error.details || {}
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
