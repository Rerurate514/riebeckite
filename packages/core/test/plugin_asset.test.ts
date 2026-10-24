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
  assert.deepEqual(
    createClientEntry(
      "external",
      "@example/riebeckite-plugin/client",
      "initExternal",
      undefined,
      "page",
      "context",
    ),
    {
      pluginName: "external",
      moduleSpecifier: "@example/riebeckite-plugin/client",
      exportName: "initExternal",
      scope: "page",
      initializerArguments: "context",
    },
  );
  assert.deepEqual(
    createClientEntry(
      "conditional",
      "@example/riebeckite-plugin/client",
      "initConditional",
      undefined,
      "page",
      "context",
      "[data-conditional]",
    ),
    {
      pluginName: "conditional",
      moduleSpecifier: "@example/riebeckite-plugin/client",
      exportName: "initConditional",
      scope: "page",
      initializerArguments: "context",
      presenceSelector: "[data-conditional]",
    },
  );
});
