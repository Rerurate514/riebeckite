import assert from "node:assert/strict";
import { test } from "node:test";
import { createPreview, parsePreviewInput } from "@riebeckite/preview";
import { previewRegistry } from "../app/preview-registry.js";
import worker from "../app/preview-worker.js";

test("accepts registered preview plugins, fixtures, and declared options", () => {
  const input = parsePreviewInput(
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
    assert.equal(parsePreviewInput(input, previewRegistry), undefined);
  }
});

test("renders the code-annotations fixture with diff markers", async () => {
  const preview = createPreview({
    registry: previewRegistry,
    fixture: "diff",
  });
  const result = await preview.render({
    pluginId: "code-annotations",
    options: {},
  });

  assert.match(result.html, /rr-code__line--add/);
  assert.match(result.html, /rr-code__line--remove/);
  assert.match(result.html, /rr-code__diff-marker/);
  await preview.dispose();
});

test("renders every registered plugin fixture through the preview runtime", async () => {
  const expectedOutput = {
    autocardlink: "rr-cardlink",
    "code-annotations": "rr-code__diff-marker",
    "code-enhance": "rr-code__body",
    "code-tabs": "rr-code-tabs",
    "hard-breaks": "<br>",
    highlight: "<mark",
    lightbox: "rr-lightbox-image",
    "obsidian-markdown": "rr-callout",
    sidenotes: "rr-sidenotes__body",
    shortcodes: "rb-shortcode",
  } as const;

  for (const plugin of previewRegistry.plugins) {
    const fixture = plugin.fixtures[0];
    assert.ok(fixture, `${plugin.id} needs a fixture`);
    const preview = createPreview({ registry: previewRegistry });
    const result = await preview.render({
      pluginId: plugin.id,
      markdown: fixture.markdown,
    });

    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.severity === "error"),
      false,
      `${plugin.id} returned an error diagnostic`,
    );
    assert.notEqual(result.html.trim(), "", `${plugin.id} rendered no HTML`);
    assert.match(
      result.html,
      new RegExp(expectedOutput[plugin.id as keyof typeof expectedOutput]),
      `${plugin.id} did not render its expected transform`,
    );
    assert.doesNotMatch(result.html, /<script|on\w+=|javascript:/i);
    await preview.dispose();
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
