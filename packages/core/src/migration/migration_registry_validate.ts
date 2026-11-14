import {
  FRONTMATTER_KEY,
  MIGRATION_ID,
  RULE_KINDS,
} from "./migration_registry_consts.js";
import { ContentMigrationRegistryError } from "./migration_registry_errors.js";
import type { ContentMigrationRule } from "./migration_rules.js";
import type {
  ContentMigrationDefinition,
  ContentMigrationReversible,
} from "./migration_types.js";

export function validateMigrationDefinition(
  definition: ContentMigrationDefinition,
): void {
  if (!definition || typeof definition !== "object")
    throw new ContentMigrationRegistryError(
      "invalid-definition",
      "Migration definition must be an object.",
    );
  if (typeof definition.id !== "string" || !MIGRATION_ID.test(definition.id))
    throw new ContentMigrationRegistryError(
      "invalid-id",
      `Invalid migration id: ${String(definition.id)}`,
    );
  if (
    typeof definition.version !== "number" ||
    !Number.isInteger(definition.version) ||
    definition.version < 1
  )
    throw new ContentMigrationRegistryError(
      "invalid-version",
      `Migration "${definition.id}" requires a positive integer version.`,
    );
  if (
    typeof definition.description !== "string" ||
    definition.description.trim().length === 0
  )
    throw new ContentMigrationRegistryError(
      "invalid-description",
      `Migration "${definition.id}" requires a description.`,
    );
  const dependencies = definition.dependsOn ?? [];
  if (!Array.isArray(dependencies))
    throw new ContentMigrationRegistryError(
      "invalid-dependency",
      `Migration "${definition.id}" has invalid dependencies.`,
    );
  const unique = new Set<string>();
  for (const dependency of dependencies) {
    if (typeof dependency !== "string" || !MIGRATION_ID.test(dependency))
      throw new ContentMigrationRegistryError(
        "invalid-dependency",
        `Migration "${definition.id}" has an invalid dependency.`,
      );
    if (dependency === definition.id)
      throw new ContentMigrationRegistryError(
        "self-dependency",
        `Migration "${definition.id}" cannot depend on itself.`,
      );
    if (unique.has(dependency))
      throw new ContentMigrationRegistryError(
        "duplicate-dependency",
        `Migration "${definition.id}" lists "${dependency}" more than once.`,
      );
    unique.add(dependency);
  }
  for (const [name, value] of [
    ["select", definition.select],
    ["transform", definition.transform],
    ["validate", definition.validate],
  ] as const) {
    if (value !== undefined && typeof value !== "function")
      throw new ContentMigrationRegistryError(
        "invalid-function",
        `Migration "${definition.id}" has an invalid ${name}.`,
      );
  }
  const rules = definition.rules ?? [];
  if (!Array.isArray(rules))
    throw new ContentMigrationRegistryError(
      "invalid-rules",
      `Migration "${definition.id}" has invalid rules.`,
    );
  for (const rule of rules) validateRule(definition.id, rule);
  if (
    definition.reversible !== undefined &&
    definition.reversible !== false &&
    (typeof definition.reversible !== "object" ||
      definition.reversible === null ||
      typeof definition.reversible.description !== "string" ||
      definition.reversible.description.trim().length === 0)
  )
    throw new ContentMigrationRegistryError(
      "invalid-reversible",
      `Migration "${definition.id}" has invalid reversibility information.`,
    );
}

export function validateRule(id: string, rule: ContentMigrationRule): void {
  if (!rule || typeof rule !== "object" || !RULE_KINDS.has(rule.kind))
    throw new ContentMigrationRegistryError(
      "invalid-rule",
      `Migration "${id}" contains an unsupported rule.`,
    );
  if (
    "when" in rule &&
    rule.when !== undefined &&
    typeof rule.when !== "function"
  )
    throw new ContentMigrationRegistryError(
      "invalid-rule",
      `Migration "${id}" contains an invalid rule condition.`,
    );
  switch (rule.kind) {
    case "frontmatter-set":
      assertKey(id, rule.key);
      return;
    case "frontmatter-remove":
      assertKey(id, rule.key);
      return;
    case "frontmatter-rename":
      assertKey(id, rule.from);
      assertKey(id, rule.to);
      if (rule.from === rule.to)
        throw new ContentMigrationRegistryError(
          "invalid-rule",
          `Migration "${id}" renames "${rule.from}" to itself.`,
        );
      return;
    case "frontmatter-normalize-list":
      assertKey(id, rule.key);
      if (rule.separator !== undefined && !(rule.separator instanceof RegExp))
        throw new ContentMigrationRegistryError(
          "invalid-rule",
          `Migration "${id}" has an invalid list separator.`,
        );
      return;
    case "frontmatter-map":
      assertKey(id, rule.key);
      if (typeof rule.map !== "function")
        throw new ContentMigrationRegistryError(
          "invalid-rule",
          `Migration "${id}" has an invalid map function.`,
        );
      return;
    case "frontmatter-append":
      assertKey(id, rule.key);
      return;
    case "visibility":
      if (!["public", "unlisted", "draft"].includes(rule.visibility))
        throw new ContentMigrationRegistryError(
          "invalid-rule",
          `Migration "${id}" has an invalid visibility.`,
        );
      return;
    case "content-id":
      if (typeof rule.id !== "string" && typeof rule.id !== "function")
        throw new ContentMigrationRegistryError(
          "invalid-rule",
          `Migration "${id}" has an invalid content id rule.`,
        );
      return;
    case "permalink":
      if (
        typeof rule.permalink !== "string" &&
        typeof rule.permalink !== "function"
      )
        throw new ContentMigrationRegistryError(
          "invalid-rule",
          `Migration "${id}" has an invalid permalink rule.`,
        );
      return;
    case "path-rename":
      assertRelativePath(id, rule.from);
      assertRelativePath(id, rule.to);
      return;
  }
}

export function assertKey(id: string, key: string): void {
  if (typeof key !== "string" || !FRONTMATTER_KEY.test(key) || !key.trim())
    throw new ContentMigrationRegistryError(
      "invalid-rule",
      `Migration "${id}" has an invalid frontmatter key.`,
    );
}

export function assertRelativePath(id: string, path: string): void {
  if (
    typeof path !== "string" ||
    !path.trim() ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").includes("..")
  )
    throw new ContentMigrationRegistryError(
      "invalid-rule",
      `Migration "${id}" has an invalid relative path.`,
    );
}

export function normalizeReversible(
  value: ContentMigrationReversible | false | undefined,
): ContentMigrationReversible | undefined {
  if (!value) return undefined;
  return Object.freeze({ description: value.description.trim() });
}
