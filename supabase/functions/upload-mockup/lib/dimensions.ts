export function getPngDimensions(buffer: Uint8Array): { width: number; height: number } | null {
  // Check PNG signature
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return null;
  }

  // The IHDR chunk starts at byte 12 (8-byte signature + 4-byte chunk length)
  // But we should verify the "IHDR" type at byte 12-15
  const type = new TextDecoder().decode(buffer.slice(12, 16));
  if (type !== "IHDR") return null;

  // Width is at bytes 16-19
  // Height is at bytes 20-23
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);

  return { width, height };
}
