import { ContentMigrationRegistryError } from "./migration_registry_errors.js";
import {
  addWithDependencies,
  compareMigrations,
  latestRegistered,
  topologicalOrder,
} from "./migration_registry_order.js";
import {
  fingerprintContentMigrationDefinition,
  migrationKey,
} from "./migration_registry_serialize.js";
import type { ContentMigrationRegistry } from "./migration_registry_types.js";
import {
  normalizeReversible,
  validateMigrationDefinition,
} from "./migration_registry_validate.js";
import type {
  ContentMigration,
  ContentMigrationDefinition,
} from "./migration_types.js";

export { ContentMigrationRegistryError } from "./migration_registry_errors.js";
export {
  fingerprintContentMigrationDefinition,
  migrationKey,
  normalizeContentMigrationDiagnostics,
  stableSerialize,
} from "./migration_registry_serialize.js";
export type { ContentMigrationRegistry } from "./migration_registry_types.js";

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

export type {
  ContentMigration,
  ContentMigrationDefinition,
  ContentMigrationSelector,
  ContentMigrationTransform,
  ContentMigrationValidator,
} from "./migration_types.js";
