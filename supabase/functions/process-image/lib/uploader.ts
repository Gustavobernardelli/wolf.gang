export async function uploadImage(
  supabase: any,
  hash: string,
  buffer: ArrayBuffer
) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  
  // path: Imagens/YYYY/MM/DD/hash16.webp
  const storagePath = `Imagens/${year}/${month}/${day}/${hash.substring(0, 16)}.webp`;

  const { data, error } = await supabase.storage
    .from('Midia')
    .upload(storagePath, buffer, {
      cacheControl: '31536000',
      contentType: 'image/webp',
      upsert: false, // se já existe no momento do upload, falha
    });

  if (error) {
    if (error.message.includes('The resource already exists')) {
      // Conflito de concorrência. Alguém acabou de fazer upload enquanto otimizávamos.
      // Vamos apenas retornar o path existente.
      return { storagePath, existed: true };
    }
    throw { code: 'UPLOAD_FAILED', message: `Storage upload failed: ${error.message}` };
  }

  return { storagePath, existed: false };
}
