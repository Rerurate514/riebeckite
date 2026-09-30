import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { GALLERY_ATTRIBUTE, gallery } from "../index.ts";

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
  return `\`\`\`gallery\n${body}\`\`\`\n`;
}

function document(title: string, body: string): string {
  return `---\npublish: true\ntitle: ${title}\n---\n\n${fence(body)}`;
}

const files = {
  "grid.md": document(
    "Grid",
    "items:\n  - title: Default\n    href: /themes/default\n    image: /themes/default.png\n  - title: Gruvbox\n    href: /themes/gruvbox\n",
  ),
  "broken.md": document("Broken", "items: [1, 2\n"),
  "sparse.md": document("Sparse", "items:\n  - description: nothing to show\n"),
};

function manager() {
  return new ContentManager(source(files), [], {
    config: explicitConfig,
    plugins: [gallery()],
  });
}

test("renders a gallery block in the manifest", async () => {
  const manifest = await manager().getManifest();
  const html = manifest.bySlug.get("grid")?.html ?? "";

  assert.ok(html.includes(GALLERY_ATTRIBUTE));
  assert.ok(html.includes('class="rr-gallery__items"'));
  assert.ok(html.includes('href="/themes/default"'));
  assert.ok(html.includes('src="/themes/default.png"'));
  assert.ok(!html.includes('data-rr-gallery="'));
});

test("updates the cached PostContent html used by the content route", async () => {
  const content = manager();
  const manifest = await content.getManifest();

  const processed = await content.getProcessedContent("grid");
  assert.equal(processed.html, manifest.bySlug.get("grid")?.html);
  assert.ok(processed.html.includes("rr-gallery__items"));
});

test("reports invalid YAML as an error and renders an error box", async () => {
  const manifest = await manager().getManifest();
  const html = manifest.bySlug.get("broken")?.html ?? "";

  assert.ok(html.includes("rr-gallery--error"));
  const diagnostic = manifest.diagnostics.find(
    (candidate) => candidate.code === "gallery-invalid",
  );
  assert.ok(diagnostic);
  assert.equal(diagnostic.severity, "error");
  assert.equal(diagnostic.slug, "broken");
  assert.equal(diagnostic.pluginName, "gallery");
});

test("warns about items missing a title and an image", async () => {
  const manifest = await manager().getManifest();
  const diagnostic = manifest.diagnostics.find(
    (candidate) => candidate.code === "gallery-item-incomplete",
  );

  assert.ok(diagnostic);
  assert.equal(diagnostic.severity, "warning");
  assert.equal(diagnostic.slug, "sparse");
  assert.ok((manifest.bySlug.get("sparse")?.html ?? "").includes("__items"));
});

test("registers the stylesheet asset", async () => {
  const manifest = await manager().getManifest();

  assert.ok(
    manifest.assets.some(
      (asset) =>
        asset.moduleSpecifier === "@riebeckite/plugin-gallery/style.css",
    ),
  );
});

test("validates option shapes", () => {
  assert.deepEqual(gallery().validateOptions?.({}), []);

  const plugin = gallery({ columns: 0, language: "", aspect: "" });
  const paths = (plugin.validateOptions?.(plugin.options) ?? [])
    .map((issue) => issue.path)
    .sort();

  assert.deepEqual(paths, ["aspect", "columns", "language"]);
});
