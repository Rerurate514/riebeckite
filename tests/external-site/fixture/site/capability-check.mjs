import assert from "node:assert/strict";
import {
  PluginDependencyError,
  resolvePlugins,
} from "@riebeckite/core";

const names = (plugins) => plugins.map((plugin) => plugin.name);

function expectDependencyError(factory, kind) {
  assert.throws(factory, (error) => {
    assert.ok(
      error instanceof PluginDependencyError,
      `expected PluginDependencyError, got ${error}`,
    );
    assert.equal(error.kind, kind);
    return true;
  });
}

// A required capability orders its provider before the consumer.
assert.deepEqual(
  names(
    resolvePlugins([
      { name: "consumer", requires: ["content.query"] },
      { name: "provider", provides: ["content.query"] },
    ]),
  ),
  ["provider", "consumer"],
);

// An optional capability is ordered the same way when a provider exists.
assert.deepEqual(
  names(
    resolvePlugins([
      { name: "consumer", optional: ["content.query"] },
      { name: "provider", provides: ["content.query"] },
    ]),
  ),
  ["provider", "consumer"],
);

// An optional capability with no provider is ignored.
assert.deepEqual(
  names(resolvePlugins([{ name: "consumer", optional: ["content.query"] }])),
  ["consumer"],
);

// Missing required capabilities report the plugin, capability, and alternatives.
assert.throws(
  () =>
    resolvePlugins([
      { name: "consumer", requires: ["content.query"] },
      { name: "other", provides: ["content.other"] },
    ]),
  (error) => {
    assert.ok(error instanceof PluginDependencyError);
    assert.equal(error.kind, "missing-capability");
    assert.match(error.message, /consumer/);
    assert.match(error.message, /content\.query/);
    assert.match(error.message, /content\.other/);
    return true;
  },
);

expectDependencyError(
  () =>
    resolvePlugins([
      { name: "a", provides: ["shared"] },
      { name: "b", provides: ["shared"] },
    ]),
  "duplicate-provider",
);

expectDependencyError(
  () => resolvePlugins([{ name: "loop", provides: ["x"], requires: ["x"] }]),
  "self-dependency",
);

expectDependencyError(
  () =>
    resolvePlugins([
      { name: "a", provides: ["x"], requires: ["y"] },
      { name: "b", provides: ["y"], requires: ["x"] },
    ]),
  "cycle",
);

expectDependencyError(
  () =>
    resolvePlugins([
      { name: "blank", provides: ["content.query"] },
      { name: "consumer", requires: ["   "] },
    ]),
  "invalid-capability",
);

console.log("capability-check OK");
