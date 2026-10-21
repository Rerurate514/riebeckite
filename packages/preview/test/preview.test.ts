import assert from "node:assert/strict";
import { test } from "node:test";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import {
  createPreview,
  createPreviewRegistry,
  definePluginPreview,
} from "../index.js";

const codeTabsPreview = definePluginPreview({
  id: "code-tabs",
  title: "Code tabs",
  availability: "browser" as const,
  fixtures: [
    {
      id: "basic",
      title: "Basic",
      markdown: '```ts tab="TypeScript"\nconst answer = 42;\n```',
    },
  ],
  create: (options: { syncTabs?: boolean } | undefined) => codeTabs(options),
});

test("renders markdown through the Riebeckite pipeline", async () => {
  const preview = createPreview({ plugins: [codeTabsPreview] });

  const result = await preview.render({
    markdown: [
      '```ts tab="TypeScript"',
      "const answer = 42;",
      "```",
      "",
      '```js tab="JavaScript"',
      "const answer = 42;",
      "```",
    ].join("\n"),
    pluginId: "code-tabs",
  });

  assert.match(result.html, /rr-code-tabs/);
  assert.match(result.html, /data-code-tabs/);
  assert.equal(result.diagnostics.length, 0);
  await preview.dispose();
});

test("uses a selected fixture and preserves explicit empty markdown", async () => {
  const preview = createPreview({
    registry: createPreviewRegistry({
      fixtures: [{ id: "empty", title: "Empty", markdown: "# Fixture" }],
      plugins: [codeTabsPreview],
    }),
    fixture: "empty",
  });

  const fixtureResult = await preview.render({});
  assert.match(fixtureResult.html, /Fixture/);

  const result = await preview.render({ markdown: "", pluginId: "code-tabs" });

  assert.equal(result.html, "");
  await preview.dispose();
});

test("sanitizes untrusted markdown HTML", async () => {
  const preview = createPreview();

  const result = await preview.render({
    markdown:
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a>',
  });

  assert.doesNotMatch(result.html, /script|onerror|javascript:/i);
  await preview.dispose();
});

test("reports registry collisions", () => {
  assert.throws(
    () =>
      createPreviewRegistry({
        plugins: [codeTabsPreview, { ...codeTabsPreview }],
      }),
    /Duplicate plugin ID/,
  );
});

test("rejects unavailable and invalid preview input", async () => {
  const unavailable = definePluginPreview({
    ...codeTabsPreview,
    id: "node-only",
    availability: "node" as const,
  });
  const preview = createPreview({ plugins: [unavailable] });

  const unavailableResult = await preview.render({
    markdown: "# Test",
    pluginId: "node-only",
  });
  assert.equal(unavailableResult.diagnostics[0]?.code, "plugin-unavailable");

  const invalidResult = await preview.render({
    markdown: "# Test",
    options: () => undefined,
  });
  assert.equal(invalidResult.diagnostics[0]?.code, "invalid-options");
  await preview.dispose();
});

test("reports plugin option validation failures without rendering", async () => {
  const invalidPlugin = definePluginPreview({
    id: "invalid-options",
    title: "Invalid options",
    availability: "browser" as const,
    fixtures: [],
    create: () => ({
      name: "invalid-options",
      validateOptions: () => [{ path: "enabled", message: "Invalid option" }],
    }),
  });
  const preview = createPreview({ plugins: [invalidPlugin] });

  const result = await preview.render({
    markdown: "# Test",
    pluginId: "invalid-options",
  });

  assert.equal(result.diagnostics[0]?.code, "invalid-options");
  await preview.dispose();
});

test("disposes a session once", async () => {
  const preview = createPreview();
  await preview.dispose();

  const result = await preview.render({ markdown: "# Test" });
  assert.equal(result.diagnostics[0]?.code, "preview-disposed");
});
