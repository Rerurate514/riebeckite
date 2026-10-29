import assert from "node:assert/strict";
import { test } from "node:test";
import { codeTabs } from "../index.js";

test("registers the code-tabs markdown, HTML, and client pipeline", () => {
  const plugin = codeTabs();
  assert.equal(plugin.name, "code-tabs");
  assert.equal(plugin.processedContentCache?.version, "code-tabs-v1");
  assert.equal(plugin.remarkPlugins?.length, 1);
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initCodeTabs");
});
