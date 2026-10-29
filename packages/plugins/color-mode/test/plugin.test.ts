import assert from "node:assert/strict";
import { test } from "node:test";
import { colorMode } from "../index.js";

test("registers the color-mode asset and app lifecycle entry", () => {
  const plugin = colorMode();
  assert.equal(plugin.name, "color-mode");
  assert.equal(
    plugin.assets?.[0]?.moduleSpecifier,
    "@riebeckite/plugin-color-mode/style.css",
  );
  assert.equal(plugin.clientEntries?.[0]?.scope, "app");
});
