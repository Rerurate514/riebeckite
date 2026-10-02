import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager, type ContentSource } from "../index.js";
import { Pipeline } from "../src/pipeline.js";
import { definePlugin } from "../src/types/plugin.js";
import type { MarkdownPipelineContext } from "../src/types/plugin_pipeline.js";

const files = {
  "public.md": [
    "---",
    "publish: true",
    "---",
    "",
    "[to public](public-b.md)",
    "[to private](private.md)",
    "[to missing](missing.md)",
    "",
  ].join("\n"),
  "public-b.md": ["---", "publish: true", "---", "", "Target B.", ""].join(
    "\n",
  ),
  "private.md": ["---", "publish: false", "---", "", "Secret.", ""].join("\n"),
};

test("markdown links to unpublished targets are not rewritten to public routes", async () => {
  const content = new ContentManager(memorySource(files));
  const { html } = await content.getProcessedContent("public");
  await content.dispose();

  assert.match(html, /href="\/public-b"/);
  assert.match(html, /href="private\.md"/);
  assert.match(html, /href="missing\.md"/);
  assert.doesNotMatch(html, /href="\/private"/);
});

test("ContentManager exposes routability to the markdown pipeline", async () => {
  let context: MarkdownPipelineContext | undefined;
  const plugin = definePlugin({
    name: "capture-context",
    extendMarkdownPipeline: (_pipeline, pipelineContext) => {
      context = pipelineContext;
    },
  });
  const content = new ContentManager(memorySource(files), [], {
    plugins: [plugin],
  });

  await content.getProcessedContent("public");
  await content.dispose();

  assert.ok(context);
  assert.equal(context.isRoutable?.("public-b"), true);
  assert.equal(context.isRoutable?.("private"), false);
  assert.equal(context.isRoutable?.("missing"), false);
});

test("note embeds refuse non-routable targets", async () => {
  let context: MarkdownPipelineContext | undefined;
  const plugin = definePlugin({
    name: "capture-context",
    extendMarkdownPipeline: (_pipeline, pipelineContext) => {
      context = pipelineContext;
    },
  });
  const embedSource = {
    "public-b": "Target B body",
    private: "RIEBECKITE_PRIVATE_CONTENT_MARKER",
  };
  const pipeline = new Pipeline(
    new Map([
      ["public-b", "public-b"],
      ["private", "private"],
    ]),
    new Map([
      ["public-b", "/public-b"],
      ["private", "/private"],
    ]),
    async (slug) => embedSource[slug as keyof typeof embedSource] ?? "",
    {
      plugins: [plugin],
      isRoutable: (slug) => slug !== "private",
    },
  );

  await pipeline.execute("body", { sourceSlug: "public" });

  assert.ok(context);
  assert.ok(context.renderNoteEmbed);
  assert.equal(await context.renderNoteEmbed("private", null), null);
  const html = await context.renderNoteEmbed("public-b", null);
  assert.match(html ?? "", /Target B body/);
});

function memorySource(source: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(source).map((path) => ({ path }));
    },
    async read(entry) {
      return source[entry.path] ?? "";
    },
  };
}
