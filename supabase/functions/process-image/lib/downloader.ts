const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export async function downloadImage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Wolfgang/1.0 (Image Processor)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw { code: 'DOWNLOAD_FAILED', message: `HTTP status ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)) {
      throw { code: 'INVALID_IMAGE', message: `Mime type not supported: ${contentType}` };
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      throw { code: 'TOO_LARGE', message: 'Image size exceeds 8MB limit' };
    }

    const buffer = await response.arrayBuffer();
    
    if (buffer.byteLength > MAX_FILE_SIZE) {
      throw { code: 'TOO_LARGE', message: 'Image size exceeds 8MB limit' };
    }

    return {
      buffer,
      mimeType: contentType,
      sizeBytes: buffer.byteLength,
    };
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw { code: 'DOWNLOAD_FAILED', message: 'Download timed out' };
    }
    throw error;
  }
}
