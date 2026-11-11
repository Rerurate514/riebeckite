export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

const CALENDAR_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})(?:$|[Tt ])/;

export function toCalendarDate(value: unknown): string | null {
  if (typeof value === "string") {
    const match = CALENDAR_DATE_PREFIX.exec(value.trim());
    if (match && toIsoDate(match[1]) === `${match[1]}T00:00:00.000Z`) {
      return match[1];
    }
  }
  return toIsoDate(value)?.slice(0, 10) ?? null;
}

type EntryDateFields = {
  published?: unknown;
  date?: unknown;
  created?: unknown;
};

function firstEntryDate(
  frontmatter: EntryDateFields,
  normalize: (value: unknown) => string | null,
): string | null {
  for (const value of [
    frontmatter.published,
    frontmatter.date,
    frontmatter.created,
  ]) {
    const date = normalize(value);
    if (date !== null) return date;
  }
  return null;
}

export function resolveEntryDate(frontmatter: EntryDateFields): string | null {
  return firstEntryDate(frontmatter, toIsoDate);
}

export function resolveEntryCalendarDate(
  frontmatter: EntryDateFields,
): string | null {
  return firstEntryDate(frontmatter, toCalendarDate);
}
