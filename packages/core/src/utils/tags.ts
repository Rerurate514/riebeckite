/** Normalizes an Obsidian-style tag or returns null when it is not a tag. */
export function normalizeTag(raw: string): string | null {
  const cleaned = raw.replace(/[/-]+$/, "");
  if (!cleaned) return null;

  const isPurelyNumeric = /^[\p{N}/\-_]+$/u.test(cleaned);
  return isPurelyNumeric ? null : cleaned;
}
