import assert from "node:assert/strict";
import test from "node:test";
import { createClientEntry } from "../src/types/plugin_asset.js";

test("asset helpers preserve explicitly registered module specifiers", () => {
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
