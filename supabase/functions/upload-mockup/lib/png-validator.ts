export function isPngTransparent(buffer: Uint8Array): boolean {
  // Check PNG signature
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }

  // Color type is at byte 25
  const colorType = buffer[25];

  // 4: Grayscale with alpha
  // 6: RGBA
  if (colorType === 4 || colorType === 6) return true;

  // If color type is 0, 2, or 3, we need to scan for a tRNS chunk
  // 0: Grayscale, 2: RGB, 3: Indexed
  if (colorType === 0 || colorType === 2 || colorType === 3) {
    let offset = 8; // skip signature

    while (offset < buffer.length) {
      const length = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).getUint32(offset);
      const type = new TextDecoder().decode(buffer.slice(offset + 4, offset + 8));
      
      if (type === "tRNS") return true;
      if (type === "IDAT") break; // tRNS must precede IDAT
      if (type === "IEND") break;

      offset += length + 12; // length (4) + type (4) + data (length) + crc (4)
    }
  }

  return false;
}

export function isValidPngMime(buffer: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}
