import assert from "node:assert/strict";
import { test } from "node:test";
import { plantuml } from "../index.js";

test("registers PlantUML and rejects invalid options", () => {
  const plugin = plantuml();
  assert.equal(plugin.name, "plantuml");
  assert.equal(plugin.processedContentCache?.version, "plantuml-v1");
  assert.equal(
    plugin.assets?.[0]?.moduleSpecifier,
    "@riebeckite/plugin-plantuml/style.css",
  );
  assert.deepEqual(plugin.validateOptions?.({ server: "/plantuml" } as never), [
    { path: "server", message: "Expected an absolute http(s) URL." },
  ]);
});
