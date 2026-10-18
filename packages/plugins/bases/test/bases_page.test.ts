import assert from "node:assert/strict";
import test from "node:test";
import type { ContentSource } from "@riebeckite/core";
import { ContentManager, resolveConfig } from "@riebeckite/core";
import {
  bases,
  evaluateBasesExpression,
  parseBases,
  parseBasesExpression,
} from "../index.js";

function memorySource(input: Readonly<Record<string, string>>): ContentSource {
  return {
    async scan() {
      return Object.keys(input).map((path) => ({ path }));
    },
    async read(entry) {
      return input[entry.path] ?? "";
    },
  };
}

function createManager(input: Readonly<Record<string, string>>) {
  return new ContentManager(memorySource(input), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [bases({ showFallback: false })],
    }),
  });
}

const files = {
  "index.md": "---\npublish: true\n---\n\n![[views/Books.base]]\n",
  "views/Books.base": [
    'filters: note.status == "published" && !file.hasTag("hidden")',
    "formulas:",
    "  label: 'note.author.name.upper() + \" / \" + note.score'",
    "properties:",
    "  file.name: Book",
    "  formula.label: Label",
    "views:",
    "  - type: table",
    "    name: Books",
    "    order: [file.name, formula.label]",
    "  - type: cards",
    "    name: Cards",
    "    order: [file.name, formula.label]",
  ].join("\n"),
  "notes/Public.md":
    "---\npublish: true\nstatus: published\nscore: 7\nauthor:\n  name: Ada\ntags: [featured]\n---\n\n# Public\n",
  "notes/Hidden.md":
    "---\npublish: true\nstatus: published\nauthor:\n  name: Secret\ntags: [hidden]\n---\n\n# Hidden\n",
  "notes/Draft.md":
    "---\npublish: false\nstatus: published\nauthor:\n  name: Draft\n---\n\n# Draft\n",
  "notes/Unlisted.md":
    "---\nvisibility: unlisted\nstatus: published\nauthor:\n  name: Unlisted\n---\n\n# Unlisted\n",
};

test("publishes referenced .base documents through PageType and preserves public boundaries", async () => {
  const manager = createManager(files);
  assert.deepEqual([...(await manager.getPagePaths())], ["/views/Books"]);

  const page = await manager.resolvePage("/views/Books");
  const body = page?.body ?? "";
  assert.equal(page?.type, "bases-document");
  assert.match(body, /<main class="rb-bases-page">/);
  assert.match(body, /Public/);
  assert.match(body, /ADA \/ 7/);
  assert.match(body, /data-bases-view="table"/);
  assert.match(body, /data-bases-view="cards"/);
  assert.doesNotMatch(body, /Hidden|Secret|Draft/);
  assert.match(body, /Unlisted/);
});

test("does not publish a Base referenced only by unpublished content", async () => {
  const manager = createManager({
    "draft.md": "---\npublish: false\n---\n\n![[views/Books.base]]\n",
    "views/Books.base": "views:\n  - type: table\n",
  });
  assert.deepEqual([...(await manager.getPagePaths())], []);
});

test("rejects invalid Base YAML without declaring a page", async () => {
  const manager = createManager({
    "index.md": "---\npublish: true\n---\n\n![[views/Invalid.base]]\n",
    "views/Invalid.base": "views: [\n",
  });
  assert.deepEqual([...(await manager.getPagePaths())], []);
  const manifest = await manager.getManifest();
  assert.equal(
    manifest.diagnostics.some((item) => item.code === "bases-invalid"),
    true,
  );
});

test("keeps Markdown routes ahead of Base document routes", async () => {
  const manager = createManager({
    "index.md": "---\npublish: true\n---\n\n![[views/Books.base]]\n",
    "views/Books.base": "views:\n  - type: table\n",
    "views/Books.md": "---\npublish: true\n---\n\n# Note\n",
  });
  assert.deepEqual([...(await manager.getPagePaths())], []);
  const manifest = await manager.getManifest();
  assert.equal(
    manifest.diagnostics.some((item) => item.code === "bases-invalid"),
    true,
  );
});

test("parses and evaluates nested formulas without executing JavaScript", () => {
  const parsed = parseBases({
    formulas: { doubled: "note.score * 2", label: "formula.doubled + 1" },
    filters:
      "(note.score >= 3 && !file.hasTag('hidden')) || note.author.name == 'Ada'",
  });
  assert.equal(parsed.ok, true);
  const expression = parseBasesExpression("formula.label");
  assert.equal(expression.ok, true);
  const entry = {
    slug: "notes/Example",
    permalink: "/notes/Example",
    title: "Example",
    tags: [],
    links: [],
    frontmatter: { score: 3, author: { name: "Ada" } },
  } as never;
  assert.equal(
    evaluateBasesExpression(expression.value, entry, parsed.value.formulas),
    7,
  );
  const unsafe = parseBasesExpression("process.exit(1)");
  assert.equal(unsafe.ok, true);
  assert.equal(
    evaluateBasesExpression(unsafe.value, entry, parsed.value.formulas),
    undefined,
  );
});
