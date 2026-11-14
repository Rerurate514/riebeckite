export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === "number" && Number.isFinite(value))
    return new Date(value);
  if (typeof value !== "string") return null;
  const time = Date.parse(value.trim());
  return Number.isNaN(time) ? null : new Date(time);
}

export function toDataviewTime(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value.trim());
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatDateValue(
  value: unknown,
  format: unknown,
): string | null {
  const date = toDate(value);
  if (!date) return null;
  const pattern = typeof format === "string" ? format : "yyyy-MM-dd";
  const pad = (part: number) => String(part).padStart(2, "0");
  return pattern
    .replace(/yyyy/g, String(date.getUTCFullYear()))
    .replace(/MM/g, pad(date.getUTCMonth() + 1))
    .replace(/dd/g, pad(date.getUTCDate()))
    .replace(/HH/g, pad(date.getUTCHours()))
    .replace(/mm/g, pad(date.getUTCMinutes()))
    .replace(/ss/g, pad(date.getUTCSeconds()));
}

export function lengthOf(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || Array.isArray(value)) return value.length;
  return null;
}

export function roundValue(
  value: unknown,
  precision: unknown,
  round: (value: number) => number,
): number | null {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  const digits = toNumber(precision) ?? 0;
  const factor = 10 ** Math.max(0, Math.min(10, Math.trunc(digits)));
  return round(numeric * factor) / factor;
}

export function aggregate(
  args: unknown[],
  combine: (values: number[]) => number,
): number | null {
  const values = numericValues(args);
  return values.length === 0 ? null : combine(values);
}

export function numericValues(args: unknown[]): number[] {
  const source = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return source
    .map(toNumber)
    .filter((value): value is number => value !== null);
}

export function textStartsWith(
  value: unknown,
  prefix: unknown,
  starts: boolean,
): boolean {
  if (typeof value !== "string") return false;
  const text = String(prefix ?? "");
  return starts ? value.startsWith(text) : value.endsWith(text);
}
