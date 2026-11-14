import crypto from "node:crypto";
import { normalizeReversible } from "./migration_registry_validate.js";
import type {
  ContentMigrationDefinition,
  ContentMigrationDiagnostic,
} from "./migration_types.js";

export function fingerprintContentMigrationDefinition(
  definition: ContentMigrationDefinition,
): string {
  return crypto
    .createHash("sha256")
    .update(
      stableSerialize({
        id: definition.id,
        version: definition.version,
        description: definition.description.trim(),
        dependsOn: definition.dependsOn ?? [],
        rules: definition.rules ?? [],
        select: definition.select ?? null,
        transform: definition.transform ?? null,
        validate: definition.validate ?? null,
        reversible: normalizeReversible(definition.reversible) ?? null,
      }),
    )
    .digest("hex");
}

export function stableSerialize(value: unknown): string {
  const seen = new Set<object>();
  const serialize = (current: unknown): string => {
    if (current === undefined) return '{"$undefined":true}';
    if (current === null) return "null";
    switch (typeof current) {
      case "string":
        return JSON.stringify(current);
      case "number":
        return Number.isFinite(current)
          ? String(current)
          : JSON.stringify(String(current));
      case "boolean":
        return String(current);
      case "bigint":
        return JSON.stringify(`${String(current)}n`);
      case "function":
        return JSON.stringify({ $function: String(current) });
      case "symbol":
        return JSON.stringify({ $symbol: String(current) });
      case "object":
        break;
    }
    const object = current as object;
    if (seen.has(object)) return '{"$circular":true}';
    seen.add(object);
    try {
      if (Array.isArray(object)) return `[${object.map(serialize).join(",")}]`;
      if (object instanceof Date)
        return JSON.stringify({ $date: object.toISOString() });
      if (object instanceof Uint8Array)
        return JSON.stringify({
          $bytes: Buffer.from(object).toString("base64"),
        });
      if (object instanceof RegExp)
        return JSON.stringify({ $regexp: String(object) });
      const entries = Object.entries(object as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => `${JSON.stringify(key)}:${serialize(item)}`);
      return `{${entries.join(",")}}`;
    } finally {
      seen.delete(object);
    }
  };
  return serialize(value);
}

export function migrationKey(id: string, version: number): string {
  return `${id}@${version}`;
}

export function normalizeContentMigrationDiagnostics(
  diagnostics: readonly ContentMigrationDiagnostic[],
): readonly ContentMigrationDiagnostic[] {
  return diagnostics.filter(
    (diagnostic) => diagnostic && typeof diagnostic.code === "string",
  );
}
