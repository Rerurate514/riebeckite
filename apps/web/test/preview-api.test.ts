import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPreviewRequestSizeAllowed,
  parsePreviewApiInput,
} from "../app/preview-api.js";
import { previewRegistry } from "../app/preview-registry.js";

test("accepts registered preview plugins, fixtures, and declared options", () => {
  const input = parsePreviewApiInput(
    {
      markdown: "# Preview",
      pluginId: "code-tabs",
      fixtureId: "basic",
      options: { syncTabs: true },
    },
    previewRegistry,
  );

  assert.deepEqual(input, {
    markdown: "# Preview",
    pluginId: "code-tabs",
    fixtureId: "basic",
    options: { syncTabs: true },
  });
});

test("rejects unregistered plugins, invalid fixtures, and unsafe options", () => {
  for (const input of [
    { markdown: "# Preview", pluginId: "unknown" },
    { markdown: "# Preview", pluginId: "code-tabs", fixtureId: "unknown" },
    {
      markdown: "# Preview",
      pluginId: "code-tabs",
      options: { unknown: true },
    },
    {
      markdown: "# Preview",
      pluginId: "code-tabs",
      options: { syncTabs: "true" },
    },
    { markdown: "# Preview", pluginId: "code-tabs", options: [] },
    { markdown: `# Preview${String.fromCharCode(0xd800)}` },
  ]) {
    assert.equal(parsePreviewApiInput(input, previewRegistry), undefined);
  }
});

test("enforces the request content-length boundary", () => {
  assert.equal(isPreviewRequestSizeAllowed("10"), true);
  assert.equal(isPreviewRequestSizeAllowed("not-a-number"), false);
  assert.equal(isPreviewRequestSizeAllowed("999999"), false);
});
