import type { ContentIcon, ContentIconRegistry } from "@riebeckite/core";
import type { ConversionState } from "./properties_types.js";
import type { PropertiesMessage } from "./types.js";

export function findPropertyIcon(
  registry: ContentIconRegistry | undefined,
  key: string,
): ContentIcon | undefined {
  if (!registry?.properties) return undefined;
  if (registry.properties[key]) return registry.properties[key];
  const lower = key.toLowerCase();
  for (const [candidate, icon] of Object.entries(registry.properties)) {
    if (candidate.toLowerCase() === lower) return icon;
  }
  return undefined;
}

export function report(
  state: ConversionState,
  key: string,
  value: unknown,
  reason: string,
): void {
  const message: PropertiesMessage = {
    reason: `Property \`${key}\` could not be rendered (${reason}); rendered as escaped text.`,
    propertyKey: key,
    value,
  };
  state.context.onMessage?.(message);
}

export function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return String(value);
  if (typeof value === "object" && value !== null) {
    return Object.prototype.toString.call(value);
  }
  return String(value);
}

export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
