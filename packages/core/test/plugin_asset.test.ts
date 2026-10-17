import assert from "node:assert/strict";
import test from "node:test";
import {
  createClientEntry,
  createStyleAsset,
} from "../src/types/plugin_asset.js";

test("asset helpers preserve explicitly registered module specifiers", () => {
  assert.deepEqual(
    createStyleAsset("external", "@example/riebeckite-plugin/style.css"),
    {
      pluginName: "external",
      kind: "style",
      moduleSpecifier: "@example/riebeckite-plugin/style.css",
    },
  );
  assert.deepEqual(
    createClientEntry(
      "external",
      "@example/riebeckite-plugin/client",
      "initExternal",
      { enabled: true },
    ),
    {
      pluginName: "external",
      moduleSpecifier: "@example/riebeckite-plugin/client",
      exportName: "initExternal",
      publicConfig: { enabled: true },
    },
  );
});
