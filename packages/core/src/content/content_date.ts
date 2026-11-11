export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function resolveEntryDate(frontmatter: {
  published?: unknown;
  date?: unknown;
  created?: unknown;
}): string | null {
  return toIsoDate(
    frontmatter.published ?? frontmatter.date ?? frontmatter.created,
  );
}
