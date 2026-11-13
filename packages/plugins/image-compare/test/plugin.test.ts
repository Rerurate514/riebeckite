import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { IMAGE_COMPARE_ATTRIBUTE, imageCompare } from "../index.ts";

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const explicitConfig = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

function fence(body: string): string {
  return `\`\`\`image-compare\n${body}\`\`\`\n`;
}

function document(title: string, body: string): string {
  return `---\npublish: true\ntitle: ${title}\n---\n\n${body}`;
}

const files = {
  "posts/demo.md": document(
    "Demo",
    fence(
      "before: ./before.png\nafter: ../assets/after.png\nbeforeAlt: Draft\nafterAlt: Published\n",
    ),
  ),
  "posts/multiple.md": document(
    "Multiple",
    `${fence("before: ./a.png\nafter: ./b.png\norientation: vertical\n")}\n${fence("before: ./c.png\nafter: ./d.png\n")}`,
  ),
  "posts/broken.md": document(
    "Broken",
    fence("before: https://example.com/a.png\nafter: ./b.png\n"),
  ),
  "posts/invalid.md": document("Invalid", fence("before: ./a.png\n")),
};

function manager(plugins = [imageCompare()]) {
  return new ContentManager(source(files), [], {
    config: explicitConfig,
    plugins,
  });
}

test("renders a comparison and resolves images relative to the note", async () => {
  const manifest = await manager().getManifest();
  const html = manifest.bySlug.get("posts/demo")?.html ?? "";

  assert.ok(html.includes(IMAGE_COMPARE_ATTRIBUTE) === false);
  assert.ok(
    html.includes(
      'class="rr-image-compare__image rr-image-compare__image--before"',
    ),
  );
  assert.ok(html.includes('src="/posts/before.png"'));
  assert.ok(html.includes('src="/assets/after.png"'));
  assert.ok(html.includes('alt="Draft"'));
  assert.ok(html.includes('alt="Published"'));
});

test("renders every comparison block in one note", async () => {
  const html =
    (await manager().getManifest()).bySlug.get("posts/multiple")?.html ?? "";
  assert.equal(html.split("data-rr-image-compare").length - 1, 2);
  assert.ok(html.includes('data-orientation="vertical"'));
  assert.ok(html.includes('src="/posts/d.png"'));
});

test("reports unsupported images and invalid blocks", async () => {
  const manifest = await manager().getManifest();
  const diagnostics = manifest.diagnostics.filter(
    (diagnostic) => diagnostic.code === "image-compare-invalid",
  );

  assert.equal(diagnostics.length, 2);
  assert.deepEqual(diagnostics.map((diagnostic) => diagnostic.slug).sort(), [
    "posts/broken",
    "posts/invalid",
  ]);
  assert.ok(
    (manifest.bySlug.get("posts/broken")?.html ?? "").includes(
      "rr-image-compare--error",
    ),
  );
});

test("keeps the rendered html in the processed content cache", async () => {
  const content = manager();
  const manifest = await content.getManifest();
  const processed = await content.getProcessedContent("posts/demo");

  assert.equal(processed.html, manifest.bySlug.get("posts/demo")?.html);
  assert.ok(processed.html.includes("rr-image-compare__stage"));
});

test("does not render the fenced block when the plugin is disabled", async () => {
  const manifest = await manager([]).getManifest();
  const html = manifest.bySlug.get("posts/demo")?.html ?? "";

  assert.ok(!html.includes("data-rr-image-compare"));
  assert.ok(html.includes("language-image-compare"));
});
