import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { VAULT_HEATMAP_ATTRIBUTE, vaultHeatmap } from "../index.ts";

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

function fence(body = "") {
  return `\`\`\`vault-heatmap\n${body}\`\`\`\n`;
}

function document(title: string, body: string, frontmatter = "publish: true") {
  return `---\n${frontmatter}\ntitle: ${title}\n---\n\n${body}`;
}

const files = {
  "heatmap.md": document("Heatmap", fence("weeks: 2\nend: 2026-11-01\n")),
  "dated.md": document(
    "Dated",
    "Body",
    "publish: true\ncreated: 2026-10-31\nmodified: 2026-11-01",
  ),
  "hidden.md": document(
    "Hidden",
    "Body",
    "visibility: draft\ncreated: 2026-10-01\nmodified: 2026-10-02",
  ),
  "unlisted.md": document(
    "Unlisted",
    "Body",
    "visibility: unlisted\ncreated: 2026-10-03",
  ),
  "broken.md": document("Broken", fence("weeks: 0\n")),
};

function manager(plugins = [vaultHeatmap()]) {
  return new ContentManager(source(files), [], {
    config: explicitConfig,
    plugins,
  });
}

test("renders activity from discoverable notes only", async () => {
  const manifest = await manager().getManifest();
  const html = manifest.bySlug.get("heatmap")?.html ?? "";

  assert.ok(!html.includes(VAULT_HEATMAP_ATTRIBUTE));
  assert.ok(html.includes("rr-vault-heatmap__grid"));
  assert.ok(html.includes("2 updates on 2 days"));
  assert.ok(html.includes('data-level="4" data-date="2026-10-31"'));
  assert.ok(html.includes('data-level="4" data-date="2026-11-01"'));
  assert.ok(!html.includes('data-date="2026-10-01"'));
});

test("reports invalid blocks", async () => {
  const manifest = await manager().getManifest();
  const diagnostics = manifest.diagnostics.filter(
    (diagnostic) => diagnostic.code === "vault-heatmap-invalid",
  );

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.slug, "broken");
  assert.ok(
    (manifest.bySlug.get("broken")?.html ?? "").includes(
      "rr-vault-heatmap--error",
    ),
  );
});

test("keeps the rendered html in the processed content cache", async () => {
  const content = manager();
  const manifest = await content.getManifest();
  const processed = await content.getProcessedContent("heatmap");

  assert.equal(processed.html, manifest.bySlug.get("heatmap")?.html);
  assert.ok(processed.html.includes("rr-vault-heatmap__week"));
});

test("does not render when the plugin is disabled", async () => {
  const manifest = await manager([]).getManifest();
  const html = manifest.bySlug.get("heatmap")?.html ?? "";

  assert.ok(!html.includes("data-rr-vault-heatmap"));
  assert.ok(html.includes("language-vault-heatmap"));
});

test("validates option shapes", () => {
  assert.deepEqual(vaultHeatmap().validateOptions?.({}), []);

  const plugin = vaultHeatmap({
    language: "",
    weeks: 0,
    title: "",
    weekStart: "tuesday" as never,
  });
  const paths = (plugin.validateOptions?.(plugin.options) ?? [])
    .map((issue) => issue.path)
    .sort();

  assert.deepEqual(paths, ["language", "title", "weekStart", "weeks"]);
});
