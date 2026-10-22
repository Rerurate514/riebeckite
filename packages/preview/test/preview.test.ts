import assert from "node:assert/strict";
import { test } from "node:test";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import {
  createPreview,
  createPreviewDocument,
  createPreviewRegistry,
  definePluginPreview,
  parsePreviewRequest,
} from "../index.js";
import { createPreviewUiController, initPluginPreviews } from "../ui.js";

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

test("resolves wiki links against pages in a multi-page fixture", async () => {
  const preview = createPreview({
    plugins: [
      definePluginPreview({
        id: "multi-page",
        title: "Multi page",
        availability: "browser" as const,
        fixtures: [
          {
            id: "notes",
            title: "Notes",
            markdown: "[[Guide]]",
            currentPageId: "home",
            pages: [
              {
                id: "home",
                title: "Home",
                path: "Home.md",
                markdown: "[[Guide]]",
              },
              {
                id: "guide",
                title: "Guide",
                path: "Guide.md",
                markdown: "# Guide",
              },
            ],
          },
        ],
        create: () => obsidianMarkdown(),
      }),
    ],
    fixture: "notes",
  });

  const result = await preview.render({ pluginId: "multi-page" });
  assert.match(
    result.html,
    /<a href="\/Guide\/" class="rr-obsidian-wikilink">Guide<\/a>/,
  );

  const selectedPage = await preview.render({
    pluginId: "multi-page",
    pageId: "guide",
  });
  assert.match(selectedPage.html, /<h1 id="user-content-guide">Guide<\/h1>/);
  await preview.dispose();
});

test("sanitizes untrusted markdown HTML", async () => {
  const preview = createPreview();

  const result = await preview.render({
    markdown:
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><a href="&#x6a;avascript:alert(1)">encoded</a><svg><script>alert(1)</script></svg><math><mi>x</mi></math><iframe srcdoc="<script>alert(1)</script>"></iframe><div style="background:url(javascript:alert(1))">x</div><img src="data:text/html;base64,PHNjcmlwdD4="><mark class="rb-highlight">safe</mark><a class="rr-link" href="https://example.com">safe link</a>',
  });

  assert.doesNotMatch(
    result.html,
    /script|onerror|javascript:|iframe|style=|srcdoc|<math|data:text\/html/i,
  );
  assert.match(result.html, /<mark class="rb-highlight">safe<\/mark>/);
  assert.match(
    result.html,
    /<a class="rr-link" href="https:\/\/example\.com">safe link<\/a>/,
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

test("parses bounded registered preview HTTP input", async () => {
  const registry = createPreviewRegistry({ plugins: [codeTabsPreview] });
  const result = await parsePreviewRequest(
    new Request("https://example.com/preview", {
      method: "POST",
      body: JSON.stringify({
        markdown: "# Preview",
        pluginId: "code-tabs",
        fixtureId: "basic",
        options: { syncTabs: true },
      }),
    }),
    registry,
  );

  assert.deepEqual(result, {
    kind: "ok",
    input: {
      markdown: "# Preview",
      pluginId: "code-tabs",
      fixtureId: "basic",
      options: { syncTabs: true },
    },
  });
});

test("rejects malformed and oversized preview HTTP input", async () => {
  const registry = createPreviewRegistry({ plugins: [codeTabsPreview] });
  const malformed = await parsePreviewRequest(
    new Request("https://example.com/preview", { method: "POST", body: "{" }),
    registry,
  );
  const oversized = await parsePreviewRequest(
    new Request("https://example.com/preview", {
      method: "POST",
      headers: { "content-length": "999999" },
      body: "{}",
    }),
    registry,
  );
  const streamedOversized = await parsePreviewRequest(
    new Request("https://example.com/preview", {
      method: "POST",
      body: "a".repeat(2_000),
    }),
    registry,
    { maximumMarkdownLength: 1, maximumOptionsLength: 1, maximumIdLength: 1 },
  );

  assert.deepEqual(malformed, { kind: "invalid" });
  assert.deepEqual(oversized, { kind: "too-large" });
  assert.deepEqual(streamedOversized, { kind: "too-large" });
});

test("builds an isolated preview document", () => {
  const document = createPreviewDocument({
    html: "<p>Preview</p>",
    styles: [".rb-article { color: black; }"],
    themeName: 'theme"name',
    colorMode: "dark",
  });

  assert.match(document, /default-src 'none'/);
  assert.match(document, /data-theme-name="theme&quot;name"/);
  assert.match(document, /<p>Preview<\/p>/);
});

test("exports the browser preview UI entry point", () => {
  assert.equal(typeof initPluginPreviews, "function");
});

test("renders only the latest preview UI response", async () => {
  const states: string[] = [];
  const pending: ((value: { html: string; diagnostics: [] }) => void)[] = [];
  const controller = createPreviewUiController({
    request: () =>
      new Promise((resolve) => {
        pending.push(resolve);
      }),
    onStateChange: (state) => {
      states.push(state.kind === "rendered" ? state.response.html : state.kind);
    },
  });

  const first = controller.render({ markdown: "first", options: {} });
  const second = controller.render({ markdown: "second", options: {} });
  pending[1]?.({ html: "second", diagnostics: [] });
  pending[0]?.({ html: "first", diagnostics: [] });
  await Promise.all([first, second]);
  controller.dispose();
  await controller.render({ markdown: "ignored", options: {} });

  assert.deepEqual(states, ["rendering", "rendering", "second"]);
});
