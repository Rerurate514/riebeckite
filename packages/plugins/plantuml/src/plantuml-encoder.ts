/**
 * PlantUML text encoding.
 *
 * `plantuml()` does not talk to a PlantUML server at build time. It only builds
 * the image URL a browser can load later, using PlantUML's documented
 * "text encoding" scheme:
 *
 * 1. Encode the diagram source to UTF-8 bytes.
 * 2. Compress the bytes with raw DEFLATE (RFC 1951 — no zlib header or
 *    Adler-32 checksum), which is what `zlib.deflateRawSync` produces.
 * 3. Re-encode the compressed bytes with PlantUML's custom base64 variant.
 *
 * PlantUML's base64 variant is *not* the standard RFC 4648 alphabet. It uses
 * `0-9A-Za-z-_` (64 characters) and emits one 6-bit character per 6 bits with
 * a most-significant-bit-first order. Compressed bytes are consumed in 3-byte
 * groups that produce 4 characters:
 *
 * ```
 * c1 = b1 >> 2
 * c2 = ((b1 & 0x03) << 4) | (b2 >> 4)
 * c3 = ((b2 & 0x0f) << 2) | (b3 >> 6)
 * c4 =  b3 & 0x3f
 * ```
 *
 * A trailing group that is shorter than 3 bytes is zero-padded, so no separate
 * padding character is needed.
 *
 * `node:zlib` is imported dynamically so a bundler that statically walks the
 * plugin graph never pulls a Node builtin into the client graph. The only
 * caller is `src/rehype.ts`, which itself is imported lazily from `index.ts`
 * and only runs during the build.
 */

const PLANTUML_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

/** Encodes PlantUML source into the server URL path segment. */
export async function encodePlantuml(source: string): Promise<string> {
  const { deflateRawSync } = await import("node:zlib");
  const utf8 = new TextEncoder().encode(source);
  return encodePlantumlBase64(deflateRawSync(utf8));
}

/**
 * Re-encodes raw DEFLATE bytes with PlantUML's custom base64 alphabet.
 * Exposed separately from the compression step so it can be reasoned about
 * (and tested) without a Node runtime.
 */
export function encodePlantumlBase64(bytes: Uint8Array): string {
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const b1 = bytes[index] ?? 0;
    const b2 = bytes[index + 1] ?? 0;
    const b3 = bytes[index + 2] ?? 0;
    encoded += PLANTUML_ALPHABET[b1 >> 2];
    encoded += PLANTUML_ALPHABET[((b1 & 0x03) << 4) | (b2 >> 4)];
    encoded += PLANTUML_ALPHABET[((b2 & 0x0f) << 2) | (b3 >> 6)];
    encoded += PLANTUML_ALPHABET[b3 & 0x3f];
  }
  return encoded;
}
