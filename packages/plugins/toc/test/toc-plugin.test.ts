import assert from "node:assert/strict";
import { test } from "node:test";
import { tocPlugin } from "../index.ts";

test("tocPlugin registers the style asset and the scroll-spy client entry", () => {
  const plugin = tocPlugin();

  assert.equal(plugin.name, "toc");
  assert.deepEqual(plugin.assets, [
    {
      pluginName: "toc",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-toc/style.css",
    },
  ]);
  assert.deepEqual(plugin.clientEntries, [
    {
      pluginName: "toc",
      moduleSpecifier: "@riebeckite/plugin-toc/client",
      exportName: "initTableOfContents",
    },
  ]);
});
