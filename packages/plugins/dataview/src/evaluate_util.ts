export function formatGroupKey(value: unknown): string {
  if (value === null || value === undefined) return "(none)";
  if (value instanceof Date) {
    return Number.isFinite(value.getTime())
      ? value.toISOString().slice(0, 10)
      : "(none)";
  }
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  return String(value);
}

export function startOfDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

export function stripHash(value: string): string {
  return value.startsWith("#") ? value.slice(1) : value;
}

export function normalizeFolder(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

export function folderOf(slug: string): string {
  const index = slug.lastIndexOf("/");
  return index < 0 ? "" : slug.slice(0, index);
}
