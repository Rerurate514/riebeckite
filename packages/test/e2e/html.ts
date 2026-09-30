/** Escape a string so it can be embedded literally in a `RegExp`. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract the textual bodies of `<script>` elements that carry `attribute`
 * (for example `"data-rb-hover-preview"`), joined with newlines.
 *
 * Generic on purpose: the caller supplies the attribute name so the engine
 * never hardcodes a fixture marker.
 */
export function extractScriptPayloads(html: string, attribute: string): string {
  const pattern = new RegExp(
    `<script[^>]*${escapeRegExp(attribute)}[^>]*>([\\s\\S]*?)</script>`,
    "g",
  );
  return [...html.matchAll(pattern)].map((match) => match[1] ?? "").join("\n");
}
