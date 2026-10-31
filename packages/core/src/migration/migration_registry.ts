import { createHash } from "node:crypto";
import type { ContentMigrationRule } from "./migration_rules.js";
import type {
  ContentMigration,
  ContentMigrationDefinition,
  ContentMigrationDiagnostic,
  ContentMigrationReversible,
  ContentMigrationSelector,
  ContentMigrationTransform,
  ContentMigrationValidator,
} from "./migration_types.js";

const MIGRATION_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
const FRONTMATTER_KEY = /^[^\s:]+$/u;
const RULE_KINDS = new Set<ContentMigrationRule["kind"]>([
  "frontmatter-set",
  "frontmatter-remove",
  "frontmatter-rename",
  "frontmatter-normalize-list",
  "frontmatter-map",
  "frontmatter-append",
  "visibility",
  "content-id",
  "permalink",
  "path-rename",
]);

export class ContentMigrationRegistryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ContentMigrationRegistryError";
    this.code = code;
  }
}

export type ContentMigrationRegistry = {
  readonly migrations: readonly ContentMigration[];
  readonly order: readonly ContentMigration[];
  get(id: string, version?: number): ContentMigration | undefined;
  require(id: string, version?: number): ContentMigration;
  latest(id: string): ContentMigration | undefined;
  versions(id: string): readonly ContentMigration[];
  resolve(ids?: readonly string[]): readonly ContentMigration[];
};

export function defineContentMigration(
  definition: ContentMigrationDefinition,
): ContentMigration {
  validateMigrationDefinition(definition);
  return Object.freeze({
    id: definition.id,
    version: definition.version,
    description: definition.description.trim(),
    dependsOn: Object.freeze([...(definition.dependsOn ?? [])]),
    select: definition.select ?? (() => true),
    rules: Object.freeze([...(definition.rules ?? [])]),
    transform: definition.transform,
    validate: definition.validate,
    reversible: normalizeReversible(definition.reversible),
    fingerprint: fingerprintContentMigrationDefinition(definition),
  });
}

export function createContentMigrationRegistry(
  definitions: readonly (ContentMigrationDefinition | ContentMigration)[],
): ContentMigrationRegistry {
  const migrations = definitions
    .map((definition) => defineContentMigration(definition))
    .sort(compareMigrations);
  const byId = new Map<string, ContentMigration[]>();
  const byKey = new Map<string, ContentMigration>();

  for (const migration of migrations) {
    const key = migrationKey(migration.id, migration.version);
    const duplicate = byKey.get(key);
    if (duplicate)
      throw new ContentMigrationRegistryError(
        "duplicate-migration",
        `Migration "${migration.id}" version ${migration.version} is defined more than once.`,
      );
    byKey.set(key, migration);
    const versions = byId.get(migration.id) ?? [];
    versions.push(migration);
    byId.set(migration.id, versions);
  }

  for (const migration of migrations) {
    for (const dependency of migration.dependsOn) {
      if (!byId.has(dependency))
        throw new ContentMigrationRegistryError(
          "missing-dependency",
          `Migration "${migration.id}" depends on unknown migration "${dependency}".`,
        );
    }
  }

  const selected = [...byId.values()].map(
    (versions) => versions[versions.length - 1] as ContentMigration,
  );
  const order = topologicalOrder(selected, byId);

  return {
    migrations,
    order,
    get: (id, version) =>
      version === undefined
        ? latestRegistered(byId, id)
        : byKey.get(migrationKey(id, version)),
    require: (id, version) => {
      const migration =
        version === undefined
          ? latestRegistered(byId, id)
          : byKey.get(migrationKey(id, version));
      if (!migration)
        throw new ContentMigrationRegistryError(
          "unknown-migration",
          version === undefined
            ? `Migration "${id}" is not registered.`
            : `Migration "${id}" version ${version} is not registered.`,
        );
      return migration;
    },
    latest: (id) => latestRegistered(byId, id),
    versions: (id) => Object.freeze([...(byId.get(id) ?? [])]),
    resolve: (ids) => {
      if (!ids || ids.length === 0) return order;
      const requested = new Set<string>();
      for (const id of ids) {
        if (!byId.has(id))
          throw new ContentMigrationRegistryError(
            "unknown-migration",
            `Migration "${id}" is not registered.`,
          );
        addWithDependencies(id, byId, requested);
      }
      return order.filter((migration) => requested.has(migration.id));
    },
  };
}

export function fingerprintContentMigrationDefinition(
  definition: ContentMigrationDefinition,
): string {
  return createHash("sha256")
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

function validateMigrationDefinition(
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

function validateRule(id: string, rule: ContentMigrationRule): void {
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

function assertKey(id: string, key: string): void {
  if (typeof key !== "string" || !FRONTMATTER_KEY.test(key) || !key.trim())
    throw new ContentMigrationRegistryError(
      "invalid-rule",
      `Migration "${id}" has an invalid frontmatter key.`,
    );
}

function assertRelativePath(id: string, path: string): void {
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

function normalizeReversible(
  value: ContentMigrationReversible | false | undefined,
): ContentMigrationReversible | undefined {
  if (!value) return undefined;
  return Object.freeze({ description: value.description.trim() });
}

function topologicalOrder(
  selected: readonly ContentMigration[],
  byId: ReadonlyMap<string, readonly ContentMigration[]>,
): readonly ContentMigration[] {
  const selectedById = new Map(
    selected.map((migration) => [migration.id, migration]),
  );
  const indegree = new Map<string, number>();
  const dependents = new Map<string, ContentMigration[]>();

  for (const migration of selected) {
    indegree.set(migration.id, 0);
    dependents.set(migration.id, []);
  }
  for (const migration of selected) {
    for (const dependency of migration.dependsOn) {
      const target = selectedById.get(dependency);
      if (!target) continue;
      indegree.set(migration.id, (indegree.get(migration.id) ?? 0) + 1);
      dependents.get(dependency)?.push(migration);
    }
  }

  const ready = selected
    .filter((migration) => indegree.get(migration.id) === 0)
    .sort(compareMigrations);
  const order: ContentMigration[] = [];
  while (ready.length > 0) {
    const migration = ready.shift();
    if (!migration) break;
    order.push(migration);
    const next = [...(dependents.get(migration.id) ?? [])].sort(
      compareMigrations,
    );
    for (const dependent of next) {
      const remaining = (indegree.get(dependent.id) ?? 0) - 1;
      indegree.set(dependent.id, remaining);
      if (remaining === 0) {
        ready.push(dependent);
        ready.sort(compareMigrations);
      }
    }
  }

  if (order.length !== selected.length) {
    const cycle = findCycle(selected, byId);
    throw new ContentMigrationRegistryError(
      "dependency-cycle",
      `Migration dependency cycle detected: ${cycle.join(" -> ")}`,
    );
  }
  return Object.freeze(order);
}

function findCycle(
  selected: readonly ContentMigration[],
  byId: ReadonlyMap<string, readonly ContentMigration[]>,
): string[] {
  const state = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const visit = (id: string): string[] | undefined => {
    const current = state.get(id);
    if (current === "visiting") {
      const index = stack.indexOf(id);
      return [...stack.slice(index), id];
    }
    if (current === "visited") return undefined;
    state.set(id, "visiting");
    stack.push(id);
    const migration = latestRegistered(byId, id);
    for (const dependency of migration?.dependsOn ?? []) {
      if (!byId.has(dependency)) continue;
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, "visited");
    return undefined;
  };
  for (const migration of selected) {
    const cycle = visit(migration.id);
    if (cycle) return cycle;
  }
  return selected.map((migration) => migration.id);
}

function addWithDependencies(
  id: string,
  byId: ReadonlyMap<string, readonly ContentMigration[]>,
  result: Set<string>,
): void {
  if (result.has(id)) return;
  result.add(id);
  const migration = latestRegistered(byId, id);
  for (const dependency of migration?.dependsOn ?? [])
    addWithDependencies(dependency, byId, result);
}

function latestRegistered(
  byId: ReadonlyMap<string, readonly ContentMigration[]>,
  id: string,
): ContentMigration | undefined {
  const versions = byId.get(id);
  return versions?.[versions.length - 1];
}

function compareMigrations(
  left: ContentMigration,
  right: ContentMigration,
): number {
  return left.id.localeCompare(right.id) || left.version - right.version;
}

export type {
  ContentMigration,
  ContentMigrationDefinition,
  ContentMigrationSelector,
  ContentMigrationTransform,
  ContentMigrationValidator,
};
