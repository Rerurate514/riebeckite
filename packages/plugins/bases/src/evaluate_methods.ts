import { scalarEquals } from "./conditions.js";
import { mean, startOfUtcDate } from "./evaluate_misc.js";
import type { BasesLiteral } from "./types.js";

export function arrayMethod(
  target: readonly unknown[],
  name: string,
  args: readonly unknown[],
): unknown {
  if (name === "contains")
    return target.some((value) => scalarEquals(value, args[0] as BasesLiteral));
  if (name === "join") return target.join(String(args[0] ?? ","));
  if (name === "containsAll")
    return args.every((value) =>
      target.some((item) => scalarEquals(item, value as BasesLiteral)),
    );
  if (name === "containsAny")
    return args.some((value) =>
      target.some((item) => scalarEquals(item, value as BasesLiteral)),
    );
  if (name === "unique") return [...new Set(target)];
  if (name === "flat") return target.flat();
  if (name === "sort") return [...target].sort();
  if (name === "reverse") return [...target].reverse();
  if (name === "slice")
    return target.slice(
      Number(args[0] ?? 0),
      args[1] === undefined ? undefined : Number(args[1]),
    );
  if (name === "isEmpty") return target.length === 0;
  if (name === "mean") return mean(target);
  if (name === "sum")
    return target.reduce<number>((total, value) => total + Number(value), 0);
  if (name === "min") return Math.min(...target.map(Number));
  if (name === "max") return Math.max(...target.map(Number));
  return undefined;
}

export function numberMethod(
  target: number,
  name: string,
  args: readonly unknown[],
): unknown {
  if (name === "round") {
    const digits = Number(args[0] ?? 0);
    const factor = 10 ** digits;
    return Math.round(target * factor) / factor;
  }
  if (name === "floor") return Math.floor(target);
  if (name === "ceil") return Math.ceil(target);
  if (name === "abs") return Math.abs(target);
  if (name === "toFixed") return target.toFixed(Number(args[0] ?? 0));
  return undefined;
}

export function objectMethod(target: object, name: string): unknown {
  if (name === "isEmpty") return Object.keys(target).length === 0;
  if (name === "keys") return Object.keys(target);
  if (name === "values") return Object.values(target);
  return undefined;
}

export function dateMember(date: Date, property: string): unknown {
  if (Number.isNaN(date.getTime())) return undefined;
  if (property === "year") return date.getUTCFullYear();
  if (property === "month") return date.getUTCMonth() + 1;
  if (property === "day") return date.getUTCDate();
  if (property === "hour") return date.getUTCHours();
  if (property === "minute") return date.getUTCMinutes();
  if (property === "second") return date.getUTCSeconds();
  if (property === "millisecond") return date.getUTCMilliseconds();
  if (property === "time") return date.getTime();
  if (property === "date") return startOfUtcDate(date);
  return undefined;
}

export function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "number" && Number.isFinite(value))
    return new Date(value);
  if (typeof value !== "string") return undefined;
  const source = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    const [year, month, day] = source.split("-").map(Number);
    const date = new Date(Date.UTC(year, (month ?? 1) - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === (month ?? 1) - 1 &&
      date.getUTCDate() === day
      ? date
      : undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/.test(source))
    return undefined;
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function duration(amount: unknown, unit: unknown): string | undefined {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return undefined;
  const normalized = String(unit ?? "")
    .trim()
    .toLowerCase();
  const units: Readonly<Record<string, string>> = {
    year: "years",
    years: "years",
    month: "months",
    months: "months",
    week: "weeks",
    weeks: "weeks",
    day: "days",
    days: "days",
    hour: "hours",
    hours: "hours",
    minute: "minutes",
    minutes: "minutes",
    second: "seconds",
    seconds: "seconds",
  };
  const suffix = units[normalized];
  return suffix ? `${amount} ${suffix}` : undefined;
}

export function isType(value: unknown, expected: unknown): boolean {
  const type = String(expected ?? "").toLowerCase();
  if (type === "null") return value === null;
  if (type === "array" || type === "list") return Array.isArray(value);
  if (type === "date")
    return value instanceof Date && !Number.isNaN(value.getTime());
  if (type === "object")
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    );
  return typeof value === type;
}

export function stringValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stringValue).join(", ");
  return value === null || value === undefined ? "" : String(value);
}
