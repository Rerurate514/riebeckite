import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  definePlugin,
  PluginDependencyError,
  type RiebeckitePlugin,
  resolveConfig,
  resolvePlugins,
} from "@riebeckite/core";

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const config = resolveConfig({ site: { title: "Test" } });
const files = { "index.md": "---\ntitle: Home\npublish: true\n---\n# Home" };

function manager(plugins: RiebeckitePlugin[]) {
  return new ContentManager(source(files), [], { config, plugins });
}

test("duplicate plugin name reports both indices", () => {
  assert.throws(
    () =>
      resolvePlugins([
        definePlugin({ name: "dup" }),
        definePlugin({ name: "dup" }),
      ]),
    /Plugin name "dup" is used by both plugins\[0\] and plugins\[1\]/,
  );
});

test("missing capability exposes kind, plugin, and available capabilities", () => {
  try {
    resolvePlugins([
      definePlugin({ name: "provider", provides: ["known.cap"] }),
      definePlugin({ name: "consumer", requires: ["missing.cap"] }),
    ]);
    assert.fail("expected a PluginDependencyError");
  } catch (error) {
    assert.ok(error instanceof PluginDependencyError);
    assert.equal(error.kind, "missing-capability");
    assert.equal(error.pluginName, "consumer");
    assert.equal(error.capability, "missing.cap");
    assert.deepEqual(error.availableCapabilities, ["known.cap"]);
  }
});

test("capability cycle reports the chain", () => {
  try {
    resolvePlugins([
      definePlugin({ name: "a", provides: ["a"], requires: ["b"] }),
      definePlugin({ name: "b", provides: ["b"], requires: ["a"] }),
    ]);
    assert.fail("expected a PluginDependencyError");
  } catch (error) {
    assert.ok(error instanceof PluginDependencyError);
    assert.equal(error.kind, "cycle");
  }
});

test("empty capability is rejected", () => {
  try {
    resolvePlugins([definePlugin({ name: "bad", provides: ["  "] })]);
    assert.fail("expected a PluginDependencyError");
  } catch (error) {
    assert.ok(error instanceof PluginDependencyError);
    assert.equal(error.kind, "invalid-capability");
    assert.equal(error.declaration, "provides");
  }
});

test("a throwing lifecycle hook names the plugin and hook", async () => {
  await assert.rejects(
    () =>
      manager([
        definePlugin({
          name: "boom",
          setup() {
            throw new Error("kaboom");
          },
        }),
      ]).getManifest(),
    /Plugin "boom" failed during "setup"/,
  );
});

test("duplicate page type id is rejected with both plugin names", async () => {
  await assert.rejects(
    () =>
      manager([
        definePlugin({
          name: "a",
          pageTypes: [{ id: "x", resolve: () => null }],
        }),
        definePlugin({
          name: "b",
          pageTypes: [{ id: "x", resolve: () => null }],
        }),
      ]).getManifest(),
    /Plugin page type "x" is provided by both a and b/,
  );
});

test("two page types claiming one path at equal priority collide", async () => {
  const m = manager([
    definePlugin({
      name: "a",
      pageTypes: [
        {
          id: "a",
          paths: ["/clash"],
          resolve: ({ pathname }) => ({ type: "a", pathname, body: "a" }),
        },
      ],
    }),
    definePlugin({
      name: "b",
      pageTypes: [
        {
          id: "b",
          paths: ["/clash"],
          resolve: ({ pathname }) => ({ type: "b", pathname, body: "b" }),
        },
      ],
    }),
  ]);
  await assert.rejects(
    () => m.getManifest(),
    /Multiple plugin page types declare \/clash at priority 0: plugin:a:page:a, plugin:b:page:b/,
  );
});
