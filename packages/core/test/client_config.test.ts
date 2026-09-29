import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../src/config.js";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { serializePublicClientConfig } from "../src/types/plugin_asset.js";
import { definePlugin } from "../src/types/plugin.js";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

test("manifest retains only explicitly public client entry configuration", async () => {
  const plugin = definePlugin({
    name: "example",
    options: { apiToken: "private-token", selector: ".private" },
    clientEntries: [
      {
        pluginName: "example",
        moduleSpecifier: "@example/client",
        exportName: "initExample",
        publicConfig: { selector: ".public" },
      },
    ],
  });
  const manager = new ContentManager(
    memorySource({ "note.md": "---\npublish: true\n---\n# Note" }),
    [],
    { config: resolveConfig({ site: { title: "Test" }, plugins: [plugin] }) },
  );

  const manifest = await manager.getManifest();

  assert.deepEqual(manifest.clientEntries, [
    {
      pluginName: "example",
      moduleSpecifier: "@example/client",
      exportName: "initExample",
      publicConfig: { selector: ".public" },
    },
  ]);
  assert.doesNotMatch(JSON.stringify(manifest.clientEntries), /private-token/);
});

test("public client configuration rejects values JSON cannot represent safely", () => {
  assert.equal(
    serializePublicClientConfig({ enabled: true, paths: ["/a"] }),
    '{"enabled":true,"paths":["/a"]}',
  );
  assert.throws(() => serializePublicClientConfig({ value: undefined }));
  assert.throws(() => serializePublicClientConfig({ value: Number.NaN }));
  assert.throws(() => serializePublicClientConfig({ value: new Date() }));

  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  assert.throws(() => serializePublicClientConfig(cyclic));
});
