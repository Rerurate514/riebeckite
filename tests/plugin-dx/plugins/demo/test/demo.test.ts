import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { initPluginDemo } from "../client.ts";
import { pluginDemoPlugin } from "../index.ts";

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

const config = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

const FILES: Record<string, string> = {
  "index.md": "---\ntitle: Home\npublish: true\n---\n# Home",
  "notes/alpha.md": "---\ntitle: Alpha\npublish: true\n---\n# Alpha",
  "notes/beta.md": "---\ntitle: Beta\npublish: true\n---\n# Beta",
  "notes/draft.md":
    "---\ntitle: Draft Secret\ndraft: true\n---\n# Draft Secret",
};

function manager(options?: Parameters<typeof pluginDemoPlugin>[0]) {
  return new ContentManager(source(FILES), [], {
    config,
    plugins: [pluginDemoPlugin(options)],
  });
}

test("declares the demo path in the manifest", async () => {
  const result = await manager().getManifest();
  assert.deepEqual(result.pagePaths, ["/plugin-demo"]);
  const route = result.pageRoutes.find(
    (candidate) => candidate.pluginName === "plugin-dx-demo",
  );
  assert.equal(route?.pageType, "plugin-dx-demo-index");
});

test("resolves the generated page listing discoverable content only", async () => {
  const page = await manager().resolvePage("/plugin-demo");
  assert.ok(page);
  assert.equal(page.type, "plugin-dx-demo-index");
  assert.ok(page.body.includes(">Alpha</a>"));
  assert.ok(page.body.includes(">Beta</a>"));
  assert.ok(!page.body.includes("Draft Secret"));
});

test("returns null for unmatched paths", async () => {
  assert.equal(await manager().resolvePage("/nope"), null);
});

test("declares a style asset and a named client entry", () => {
  const plugin = pluginDemoPlugin();
  assert.deepEqual(plugin.assets, [
    {
      pluginName: "plugin-dx-demo",
      kind: "style",
      moduleSpecifier: "@plugin-dx/demo/style.css",
    },
  ]);
  assert.deepEqual(plugin.clientEntries, [
    {
      pluginName: "plugin-dx-demo",
      moduleSpecifier: "@plugin-dx/demo/client",
      exportName: "initPluginDemo",
    },
  ]);
});

test("client initializer is SSR-safe when document is absent", () => {
  assert.doesNotThrow(() => initPluginDemo());
});
