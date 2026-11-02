import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiLifecycleValidationError,
  builtInApiLifecycle,
  createApiLifecycleRegistry,
  defineApiLifecycle,
  hasApiLifecycleConfigPath,
  resolveApiLifecycle,
  validateApiLifecycleDefinition,
} from "../index.js";

const deprecatedCall = defineApiLifecycle({
  id: "@riebeckite/core#oldCall",
  kind: "function",
  status: "deprecated",
  package: "@riebeckite/core",
  deprecatedSince: "0.2.0",
  replacement: "@riebeckite/core#newCall",
  reason: "The new call handles cancellation.",
  migrationGuide: "Replace oldCall with newCall.",
});

test("registry indexes lifecycle entries and lists deprecated APIs", () => {
  const stable = defineApiLifecycle({
    id: "@riebeckite/core#newCall",
    kind: "function",
    status: "stable",
  });
  const registry = createApiLifecycleRegistry([stable, deprecatedCall]);

  assert.deepEqual(registry.issues, []);
  assert.equal(registry.entries.length, 2);
  assert.deepEqual(registry.get("@riebeckite/core#oldCall"), deprecatedCall);
  assert.deepEqual(registry.deprecated(), [deprecatedCall]);
  assert.equal(registry.get("@riebeckite/core#missing"), undefined);
});

test("registry reports duplicate IDs and keeps the first definition", () => {
  const duplicate = { ...deprecatedCall, reason: "Second definition." };
  const registry = createApiLifecycleRegistry([deprecatedCall, duplicate]);

  assert.equal(registry.entries.length, 1);
  assert.deepEqual(registry.entries[0], deprecatedCall);
  assert.deepEqual(
    registry.issues.map((issue) => issue.code),
    ["duplicate-id"],
  );
});

test("invalid definitions are reported without throwing from the registry", () => {
  const registry = createApiLifecycleRegistry([
    {
      id: "not-an-api",
      kind: "function",
      status: "deprecated",
      deprecatedSince: "0.3.0",
    },
    {
      id: "@riebeckite/core#removedWithoutVersion",
      kind: "function",
      status: "removed",
      reason: "Removed.",
    },
  ]);

  assert.deepEqual(registry.entries, []);
  assert.deepEqual(
    [...new Set(registry.issues.map((issue) => issue.code))].sort(),
    ["invalid-id", "missing-reason", "missing-removal-version"],
  );
});

test("defineApiLifecycle rejects invalid metadata with structured issues", () => {
  assert.throws(
    () =>
      defineApiLifecycle({
        id: "@riebeckite/core#badRemoval",
        kind: "function",
        status: "deprecated",
        deprecatedSince: "0.4.0",
        removalVersion: "0.3.0",
        reason: "Invalid order.",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ApiLifecycleValidationError);
      assert.deepEqual(
        error.issues.map((issue) => issue.code),
        ["removal-not-after-deprecation"],
      );
      return true;
    },
  );
});

test("deprecated APIs may omit replacement and removal version", () => {
  const definition = defineApiLifecycle({
    id: "@riebeckite/plugin-docs#legacyOption",
    kind: "plugin-option",
    status: "deprecated",
    deprecatedSince: "0.2.0",
    reason: "The option no longer has an effect.",
    pluginOption: { plugin: "docs", option: "legacyMode" },
  });

  assert.deepEqual(validateApiLifecycleDefinition(definition), []);
  assert.equal(definition.removalVersion, undefined);
  assert.equal(definition.replacement, undefined);
});

test("resolved registries include built-in APIs and plugin declarations", () => {
  const config = {
    plugins: [
      {
        name: "docs",
        apiLifecycle: [deprecatedCall],
      },
    ],
  } as never;
  const registry = resolveApiLifecycle(config);

  assert.equal(registry.entries.length, builtInApiLifecycle.length + 1);
  assert.deepEqual(registry.get(deprecatedCall.id), deprecatedCall);
  assert.ok(registry.get("@riebeckite/core#resolveApiLifecycle"));
});

test("config source paths detect raw configuration keys", () => {
  const source = { cache: { enabled: false }, plugins: [] };

  assert.equal(hasApiLifecycleConfigPath(source, "cache.enabled"), true);
  assert.equal(hasApiLifecycleConfigPath(source, "cache.directory"), false);
  assert.equal(hasApiLifecycleConfigPath(undefined, "cache.enabled"), false);
});

test("registry entries are read-only", () => {
  const registry = createApiLifecycleRegistry([deprecatedCall]);

  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.entries), true);
  assert.equal(Object.isFrozen(registry.entries[0]), true);
  assert.throws(() => {
    (registry.entries[0] as { reason?: string }).reason = "changed";
  }, TypeError);
});
