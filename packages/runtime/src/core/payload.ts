import { RuntimePayloadError } from "./errors.js";

const MAX_DEPTH = 16;
const MAX_ENTRIES = 100_000;

const encoder = new TextEncoder();

/**
 * Estimates the structured-clone payload size in bytes. It intentionally
 * rejects graphs that are too deep or too large instead of walking forever.
 */
export function estimatePayloadSize(value: unknown): number {
  return estimate(value, 0, { entries: 0 }, new WeakSet());
}

export function assertPayloadSize(
  value: unknown,
  limit: number,
  label: string,
): void {
  if (limit <= 0) return;
  const size = estimatePayloadSize(value);
  if (size > limit) {
    throw new RuntimePayloadError(
      `${label} is ${size} bytes, exceeding the ${limit} byte runtime limit.`,
    );
  }
}

function estimate(
  value: unknown,
  depth: number,
  counter: { entries: number },
  ancestors: WeakSet<object>,
): number {
  counter.entries += 1;
  if (counter.entries > MAX_ENTRIES) {
    throw new RuntimePayloadError(
      "Runtime payload contains too many entries to measure.",
    );
  }
  if (value === undefined || value === null) return 0;
  if (typeof value === "string") return encoder.encode(value).byteLength;
  if (typeof value === "number") return 8;
  if (typeof value === "boolean") return 1;
  if (typeof value === "bigint") return 16;
  if (typeof value === "function" || typeof value === "symbol") {
    throw new RuntimePayloadError(
      "Runtime payload is not structured-cloneable.",
    );
  }
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (ArrayBuffer.isView(value)) return value.byteLength;
  if (value instanceof Date) return 8;

  if (depth >= MAX_DEPTH) {
    throw new RuntimePayloadError("Runtime payload is nested too deeply.");
  }
  const objectValue = value as object;
  if (ancestors.has(objectValue)) {
    throw new RuntimePayloadError("Runtime payload must not contain cycles.");
  }
  ancestors.add(objectValue);
  let total = 0;
  if (value instanceof Map) {
    for (const [key, item] of value) {
      total += estimate(key, depth + 1, counter, ancestors);
      total += estimate(item, depth + 1, counter, ancestors);
    }
  } else if (value instanceof Set) {
    for (const item of value) {
      total += estimate(item, depth + 1, counter, ancestors);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      total += estimate(item, depth + 1, counter, ancestors);
    }
  } else {
    for (const key of Object.keys(value)) {
      total += encoder.encode(key).byteLength;
      total += estimate(
        (value as Record<string, unknown>)[key],
        depth + 1,
        counter,
        ancestors,
      );
    }
  }
  ancestors.delete(objectValue);
  return total;
}
