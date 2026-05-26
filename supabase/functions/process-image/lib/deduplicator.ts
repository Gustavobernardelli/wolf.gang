import { createClient } from 'jsr:@supabase/supabase-js@2';

export async function checkDuplicateAsset(supabase: any, hash: string) {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('hash_sha256', hash)
    .maybeSingle();

  if (error) {
    throw { code: 'PROCESSING_FAILED', message: `DB error checking hash: ${error.message}` };
  }

  return data;
}
