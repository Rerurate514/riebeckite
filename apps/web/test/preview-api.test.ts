import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPreviewRequestSizeAllowed,
  parsePreviewApiInput,
} from "../app/preview-api.js";
import { previewRegistry } from "../app/preview-registry.js";
import worker from "../app/preview-worker.js";

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
    {
      markdown: "# Preview",
      pluginId: "code-tabs",
      options: JSON.parse('{"__proto__": true}'),
    },
    {
      markdown: "# Preview",
      pluginId: "code-tabs",
      options: { syncTabs: { nested: true } },
    },
    { markdown: `# Preview${String.fromCharCode(0xd800)}` },
  ]) {
    assert.equal(parsePreviewApiInput(input, previewRegistry), undefined);
  }
});

test("returns non-cacheable generic errors for malformed worker requests", async () => {
  const response = await worker.request("http://localhost/api/playground", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await response.json(), { error: "Invalid preview input." });
});

test("enforces the request content-length boundary", () => {
  assert.equal(isPreviewRequestSizeAllowed("10"), true);
  assert.equal(isPreviewRequestSizeAllowed("not-a-number"), false);
  assert.equal(isPreviewRequestSizeAllowed("999999"), false);
});
