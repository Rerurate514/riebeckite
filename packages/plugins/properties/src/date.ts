const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+-]+Z?)?$/;
const DATE_TOKEN_PATTERN = /yyyy|MM|dd|HH|mm|ss/g;
const DATE_LETTER_PATTERN = /[A-Za-z]+/g;

export const DEFAULT_PROPERTY_DATE_FORMAT = "yyyy-MM-dd";

export function parsePropertyDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") return null;

  const input = value.trim();
  if (!ISO_DATE_PATTERN.test(input)) return null;

  const [year, month, day] = input.slice(0, 10).split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return null;
  }
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    return null;
  }

  const normalized = input.replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const parseInput = hasTimeZone
    ? normalized
    : normalized.length === 10
      ? `${normalized}T00:00:00Z`
      : `${normalized}Z`;
  const date = new Date(parseInput);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPropertyDate(date: Date, pattern: string): string {
  return pattern.replace(DATE_TOKEN_PATTERN, (token) => {
    switch (token) {
      case "yyyy":
        return pad(date.getUTCFullYear(), 4);
      case "MM":
        return pad(date.getUTCMonth() + 1, 2);
      case "dd":
        return pad(date.getUTCDate(), 2);
      case "HH":
        return pad(date.getUTCHours(), 2);
      case "mm":
        return pad(date.getUTCMinutes(), 2);
      case "ss":
        return pad(date.getUTCSeconds(), 2);
      default:
        return token;
    }
  });
}

export function isValidDatePattern(pattern: string): boolean {
  if (pattern.trim() === "") return false;
  const tokens = new Set(["yyyy", "MM", "dd", "HH", "mm", "ss"]);
  for (const letters of pattern.match(DATE_LETTER_PATTERN) ?? []) {
    if (!tokens.has(letters)) return false;
  }
  return true;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}
