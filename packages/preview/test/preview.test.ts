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
  options: {
    syncTabs: { type: "boolean", title: "Sync tabs", default: false },
  },
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

test("preserves plugin classes and attributes through sanitization", async () => {
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

  assert.match(result.html, /class="rr-code-tabs"/);
  assert.match(result.html, /class="rr-code-tabs__tab"/);
  assert.match(result.html, /role="tab"/);
  assert.match(result.html, /aria-selected="true"/);
  assert.match(result.html, /hidden/);
  await preview.dispose();
});

test("uses a selected fixture and preserves explicit empty markdown", async () => {
  const preview = createPreview({
    registry: createPreviewRegistry({
      plugins: [
        {
          ...codeTabsPreview,
          fixtures: [{ id: "empty", title: "Empty", markdown: "# Fixture" }],
        },
      ],
    }),
    fixture: "empty",
  });

  const fixtureResult = await preview.render({ pluginId: "code-tabs" });
  assert.match(fixtureResult.html, /Fixture/);

  const result = await preview.render({ markdown: "", pluginId: "code-tabs" });

  assert.equal(result.html, "");
  await preview.dispose();
});

test("sanitizes untrusted markdown HTML", async () => {
  const preview = createPreview();

  const result = await preview.render({
    markdown:
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><a href="&#x6a;avascript:alert(1)">encoded</a><svg><script>alert(1)</script></svg><math><mi>x</mi></math><iframe srcdoc="<script>alert(1)</script>"></iframe><div style="background:url(javascript:alert(1))">x</div><img src="data:text/html;base64,PHNjcmlwdD4=">',
  });

  assert.doesNotMatch(
    result.html,
    /script|onerror|javascript:|iframe|style=|srcdoc|<math|data:text\/html/i,
  );
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

test("rejects unknown and incorrectly typed declared options", async () => {
  const preview = createPreview({ plugins: [codeTabsPreview] });

  const unknown = await preview.render({
    markdown: "# Test",
    pluginId: "code-tabs",
    options: { unknown: true },
  });
  const invalidType = await preview.render({
    markdown: "# Test",
    pluginId: "code-tabs",
    options: { syncTabs: "true" },
  });

  assert.equal(unknown.diagnostics[0]?.code, "invalid-options");
  assert.equal(invalidType.diagnostics[0]?.code, "invalid-options");

  const prototypeKey = await preview.render({
    markdown: "# Test",
    pluginId: "code-tabs",
    options: JSON.parse('{"__proto__": true}'),
  });
  assert.equal(prototypeKey.diagnostics[0]?.code, "invalid-options");
  await preview.dispose();
});

test("rejects unsafe option schema keys", () => {
  assert.throws(
    () =>
      createPreviewRegistry({
        plugins: [
          {
            ...codeTabsPreview,
            options: JSON.parse(
              '{"constructor":{"type":"boolean","title":"Unsafe"}}',
            ),
          },
        ],
      }),
    /Preview option names and titles are required/,
  );
});

test("disposes a session once", async () => {
  const preview = createPreview();
  await preview.dispose();

  const result = await preview.render({ markdown: "# Test" });
  assert.equal(result.diagnostics[0]?.code, "preview-disposed");
});
