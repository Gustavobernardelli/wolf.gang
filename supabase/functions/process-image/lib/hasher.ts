import { encodeHex } from 'jsr:@std/encoding/hex';

export async function hashImage(buffer: ArrayBuffer): Promise<string> {
  // Use crypto.subtle.digest to compute SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  // encodeHex takes Uint8Array in Deno standard lib
  return encodeHex(new Uint8Array(hashBuffer));
}
