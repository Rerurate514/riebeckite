/** A value that can be represented without loss in JSON. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };

export function toJsonValue(value: unknown): JsonValue | undefined {
  return convertJsonValue(value, new Set<object>());
}

function convertJsonValue(
  value: unknown,
  ancestors: Set<object>,
): JsonValue | undefined {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return undefined;
  }
  if (typeof value === "bigint") {
    throw new TypeError("BigInt values are not JSON serializable.");
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return undefined;
  if (ancestors.has(value)) {
    throw new TypeError("Cyclic values are not JSON serializable.");
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const items: JsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        items.push(convertJsonValue(value[index], ancestors) ?? null);
      }
      return items;
    }
    const result: { [key: string]: JsonValue | undefined } = {};
    for (const [key, item] of Object.entries(value)) {
      const converted = convertJsonValue(item, ancestors);
      if (converted !== undefined) result[key] = converted;
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}
