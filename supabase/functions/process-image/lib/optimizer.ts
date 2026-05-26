import { decode as decodeJpeg } from 'npm:@jsquash/jpeg';
import { decode as decodePng } from 'npm:@jsquash/png';
import { encode as encodeWebp } from 'npm:@jsquash/webp';
import resize from 'npm:@jsquash/resize';

const MAX_WIDTH = 1920;

export async function optimizeImage(buffer: ArrayBuffer, mimeType: string) {
  try {
    let imageData;

    if (mimeType === 'image/jpeg') {
      imageData = await decodeJpeg(buffer);
    } else if (mimeType === 'image/png') {
      imageData = await decodePng(buffer);
    } else if (mimeType === 'image/webp') {
      // jsquash não expõe decodeWebp nativamente via npm import de forma fácil sem o módulo correto,
      // mas se já for webp e precisar redimensionar, o ideal é usar jsquash/webp.
      // Caso não consigamos decodificar, vamos usar ImageScript como fallback ou apenas retornar erro.
      const { decode } = await import('npm:@jsquash/webp');
      imageData = await decode(buffer);
    } else {
      // Para GIF (ou unsupported) jsquash falha.
      throw new Error(`Unsupported mime type for optimization: ${mimeType}`);
    }

    let finalWidth = imageData.width;
    let finalHeight = imageData.height;
    let wasResized = false;

    if (finalWidth > MAX_WIDTH) {
      const ratio = MAX_WIDTH / finalWidth;
      finalWidth = MAX_WIDTH;
      finalHeight = Math.round(finalHeight * ratio);
      wasResized = true;

      // redimensiona via jsquash
      imageData = await resize(imageData, { width: finalWidth, height: finalHeight });
    }

    // converte pra WebP, qualidade 82
    const webpBuffer = await encodeWebp(imageData, { quality: 82 });

    return {
      buffer: webpBuffer,
      width: finalWidth,
      height: finalHeight,
      wasResized,
    };
  } catch (err: any) {
    console.error('Optimization failed with jsquash, attempting fallback if applicable...', err);
    throw { code: 'PROCESSING_FAILED', message: `Image optimization error: ${err.message}` };
  }
}
