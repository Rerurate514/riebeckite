import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentMigrationRegistryError,
  createContentMigrationRegistry,
  defineContentMigration,
  fingerprintContentMigrationDefinition,
} from "../src/migration/migration_registry.js";

function assertRegistryError(code: string, action: () => void): void {
  assert.throws(
    action,
    (error: unknown) =>
      error instanceof ContentMigrationRegistryError && error.code === code,
  );
}

test("defines and freezes a content migration", () => {
  const migration = defineContentMigration({
    id: "rename-category",
    version: 2,
    description: "Rename category to tags.",
    dependsOn: ["normalize-tags"],
    rules: [{ kind: "frontmatter-rename", from: "category", to: "tags" }],
    reversible: { description: "Restore category from tags." },
  });

  assert.equal(migration.id, "rename-category");
  assert.equal(migration.version, 2);
  assert.deepEqual(migration.dependsOn, ["normalize-tags"]);
  assert.equal(typeof migration.select({} as never), "boolean");
  assert.ok(migration.fingerprint.length > 0);
  assert.equal(Object.isFrozen(migration), true);
  assert.equal(Object.isFrozen(migration.rules), true);
});

test("rejects invalid definitions", () => {
  assertRegistryError("invalid-id", () =>
    defineContentMigration({
      id: "Rename Category",
      version: 1,
      description: "bad",
    }),
  );
  assertRegistryError("invalid-version", () =>
    defineContentMigration({
      id: "ok",
      version: 0,
      description: "bad",
    }),
  );
  assertRegistryError("invalid-description", () =>
    defineContentMigration({ id: "ok", version: 1, description: "  " }),
  );
  assertRegistryError("self-dependency", () =>
    defineContentMigration({
      id: "ok",
      version: 1,
      description: "bad",
      dependsOn: ["ok"],
    }),
  );
  assertRegistryError("invalid-rule", () =>
    defineContentMigration({
      id: "ok",
      version: 1,
      description: "bad",
      rules: [{ kind: "unknown" } as never],
    }),
  );
  assertRegistryError("invalid-rule", () =>
    defineContentMigration({
      id: "ok",
      version: 1,
      description: "bad",
      rules: [{ kind: "frontmatter-set", key: "bad key", value: 1 }],
    }),
  );
  assertRegistryError("invalid-rule", () =>
    defineContentMigration({
      id: "ok",
      version: 1,
      description: "bad",
      rules: [{ kind: "path-rename", from: "../outside", to: "inside" }],
    }),
  );
});

test("rejects duplicate id and version", () => {
  assertRegistryError("duplicate-migration", () =>
    createContentMigrationRegistry([
      { id: "same", version: 1, description: "first" },
      { id: "same", version: 1, description: "second" },
    ]),
  );
});

test("supports several versions and resolves the latest", () => {
  const registry = createContentMigrationRegistry([
    { id: "post", version: 1, description: "first" },
    { id: "post", version: 2, description: "second" },
    { id: "post", version: 3, description: "third" },
  ]);

  assert.equal(registry.migrations.length, 3);
  assert.equal(registry.versions("post").length, 3);
  assert.equal(registry.latest("post")?.version, 3);
  assert.equal(registry.get("post", 2)?.description, "second");
  assert.equal(registry.require("post").version, 3);
  assert.deepEqual(
    registry.order.map((migration) => migration.version),
    [3],
  );
  assertRegistryError("unknown-migration", () => registry.require("missing"));
});

test("orders migrations deterministically by dependency then identity", () => {
  const definitions = [
    { id: "zeta", version: 1, description: "zeta" },
    { id: "beta", version: 1, description: "beta", dependsOn: ["alpha"] },
    { id: "alpha", version: 2, description: "alpha v2" },
    { id: "alpha", version: 1, description: "alpha v1" },
    { id: "gamma", version: 1, description: "gamma", dependsOn: ["beta"] },
  ];
  const first = createContentMigrationRegistry(definitions);
  const second = createContentMigrationRegistry([...definitions].reverse());

  assert.deepEqual(
    first.order.map((migration) => migration.id),
    ["alpha", "beta", "gamma", "zeta"],
  );
  assert.deepEqual(
    first.order.map((migration) => migration.id),
    second.order.map((migration) => migration.id),
  );
  assert.deepEqual(
    first.resolve(["gamma"]).map((migration) => migration.id),
    ["alpha", "beta", "gamma"],
  );
  assert.deepEqual(
    first.resolve().map((migration) => migration.id),
    ["alpha", "beta", "gamma", "zeta"],
  );
});

test("detects dependency cycles and missing dependencies", () => {
  assertRegistryError("dependency-cycle", () =>
    createContentMigrationRegistry([
      { id: "a", version: 1, description: "a", dependsOn: ["b"] },
      { id: "b", version: 1, description: "b", dependsOn: ["c"] },
      { id: "c", version: 1, description: "c", dependsOn: ["a"] },
    ]),
  );
  assertRegistryError("missing-dependency", () =>
    createContentMigrationRegistry([
      { id: "a", version: 1, description: "a", dependsOn: ["missing"] },
    ]),
  );
});

test("dependency resolution follows the latest version of a migration", () => {
  const registry = createContentMigrationRegistry([
    { id: "base", version: 1, description: "base v1" },
    { id: "base", version: 2, description: "base v2" },
    { id: "child", version: 1, description: "child", dependsOn: ["base"] },
  ]);

  assert.deepEqual(
    registry.order.map((migration) => `${migration.id}@${migration.version}`),
    ["base@2", "child@1"],
  );
});

test("fingerprints are stable across key order and change with behavior", () => {
  const base = {
    id: "fingerprint",
    version: 1,
    description: "Stable",
    dependsOn: ["alpha"],
    rules: [{ kind: "frontmatter-remove" as const, key: "legacy" }],
  };
  const reordered = {
    rules: [{ key: "legacy", kind: "frontmatter-remove" as const }],
    dependsOn: ["alpha"],
    description: "Stable",
    version: 1,
    id: "fingerprint",
  };

  assert.equal(
    fingerprintContentMigrationDefinition(base),
    fingerprintContentMigrationDefinition(reordered),
  );
  assert.notEqual(
    fingerprintContentMigrationDefinition(base),
    fingerprintContentMigrationDefinition({
      ...base,
      rules: [{ kind: "frontmatter-remove", key: "legacy2" }],
    }),
  );
  assert.notEqual(
    fingerprintContentMigrationDefinition(base),
    fingerprintContentMigrationDefinition({
      ...base,
      transform: () => ({ set: { x: 1 } }),
    }),
  );
  assert.notEqual(
    fingerprintContentMigrationDefinition(base),
    fingerprintContentMigrationDefinition({
      ...base,
      transform: () => ({ set: { x: 2 } }),
    }),
  );
});

test("function-based selectors are preserved and fingerprinted", () => {
  const select = (content: {
    readonly frontmatter: { readonly draft?: boolean };
  }) => content.frontmatter.draft !== true;
  const registry = createContentMigrationRegistry([
    { id: "skip-drafts", version: 1, description: "skip drafts", select },
  ]);
  const migration = registry.require("skip-drafts");

  assert.equal(
    migration.select({ frontmatter: { draft: true } } as never),
    false,
  );
  assert.equal(migration.select({ frontmatter: {} } as never), true);
});
