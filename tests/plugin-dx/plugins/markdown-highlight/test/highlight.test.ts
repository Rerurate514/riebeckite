import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { markdownHighlightPlugin } from "../index.ts";

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

const config = resolveConfig({ site: { title: "Test" } });

async function html(
  markdown: string,
  options?: Parameters<typeof markdownHighlightPlugin>[0],
): Promise<string> {
  const manifest = await new ContentManager(
    source({ "alpha.md": `---\npublish: true\n---\n${markdown}` }),
    [],
    { config, plugins: [markdownHighlightPlugin(options)] },
  ).getManifest();
  return manifest.bySlug.get("alpha")?.html ?? "";
}

test("converts ==highlight== into a mark element", async () => {
  assert.ok(
    (await html("# Alpha\n\nThis is ==hot== text.")).includes(
      "<mark>hot</mark>",
    ),
  );
});

test("applies the className option", async () => {
  assert.ok(
    (await html("==hot==", { className: "rr-highlight" })).includes(
      '<mark class="rr-highlight">hot</mark>',
    ),
  );
});

test("leaves inline code untouched", async () => {
  const rendered = await html("Use `==x==` literally and ==y== for real.");
  assert.ok(rendered.includes("==x=="));
  assert.ok(rendered.includes("<mark>y</mark>"));
});
