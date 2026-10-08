import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildDesiredPages,
  GENERATED_MARKER_PREFIX,
  generatedMarker,
  planSync,
  readGeneratedPages,
  renderPluginPage,
  rewriteReadmeLinks,
  rewriteTarget,
} from "./sync_plugin_docs.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const pluginsRoot = path.join(repositoryRoot, "packages", "plugins");
const docsPluginsRoot = path.join(repositoryRoot, "docs", "docs", "plugins");
const shortcodesDirectory = path.join(pluginsRoot, "shortcodes");
const options = {
  readmeDirectory: shortcodesDirectory,
  documentDirectory: docsPluginsRoot,
  slug: "shortcodes",
};

test("rewrites the Japanese README link to the local Japanese docs page", () => {
  assert.equal(rewriteTarget("./README_ja.md", options), "./shortcodes.ja.md");
});

test("keeps anchors when rewriting the Japanese README link", () => {
  assert.equal(
    rewriteTarget("./README_ja.md#options", options),
    "./shortcodes.ja.md#options",
  );
});

test("rewrites links into the docs tree as relative docs links", () => {
  assert.equal(
    rewriteTarget("../../../docs/docs/reference/plugin-api.md", options),
    "../reference/plugin-api.md",
  );
});

test("rewrites a cross-plugin English README to the generated docs page", () => {
  assert.equal(
    rewriteTarget("../code-enhance/README.md", options),
    "./code-enhance.md",
  );
});

test("rewrites a cross-plugin Japanese README to the Japanese docs page", () => {
  assert.equal(
    rewriteTarget("../code-enhance/README_ja.md", options),
    "./code-enhance.ja.md",
  );
});

test("rewrites repository files outside the docs tree to GitHub", () => {
  assert.equal(
    rewriteTarget(
      "../../../packages/integrations/webmention-cloudflare/README.md",
      options,
    ),
    "https://github.com/Rerurate514/riebeckite/blob/main/packages/integrations/webmention-cloudflare/README.md",
  );
});

test("leaves external, site-root, and anchor-only targets untouched", () => {
  assert.equal(
    rewriteTarget("https://example.com/", options),
    "https://example.com/",
  );
  assert.equal(
    rewriteTarget("mailto:hello@example.com", options),
    "mailto:hello@example.com",
  );
  assert.equal(rewriteTarget("/docs/plugins/", options), "/docs/plugins/");
  assert.equal(rewriteTarget("#usage", options), "#usage");
});

test("renderPluginPage strips the README title and adds the marker and page title", () => {
  const readme =
    "# @riebeckite/plugin-shortcodes\n\nSummary line.\n\nSee [日本語](./README_ja.md).\n";
  const page = renderPluginPage("shortcodes", readme);
  assert.ok(page.startsWith(GENERATED_MARKER_PREFIX));
  assert.ok(page.includes(generatedMarker("shortcodes")));
  assert.ok(page.includes("# Shortcodes"));
  assert.ok(!page.includes("@riebeckite/plugin-shortcodes"));
  assert.ok(page.includes("See [日本語](./shortcodes.ja.md)."));
  assert.ok(page.endsWith("\n"));
});

test("rewriteReadmeLinks does not rewrite links inside fenced code", () => {
  const text =
    "See [日本語](./README_ja.md).\n\n```md\n[日本語](./README_ja.md)\n```\n";
  const rewritten = rewriteReadmeLinks(text, options);
  assert.equal(
    rewritten,
    "See [日本語](./shortcodes.ja.md).\n\n```md\n[日本語](./README_ja.md)\n```\n",
  );
});

test("planSync reports missing, outdated, and stale pages", () => {
  const desired = [
    {
      pageName: "alpha.md",
      pagePath: path.join(docsPluginsRoot, "alpha.md"),
      content: "a",
    },
    {
      pageName: "beta.ja.md",
      pagePath: path.join(docsPluginsRoot, "beta.ja.md"),
      content: "b",
    },
  ];
  const onDisk = new Map([
    ["alpha.md", "old"],
    ["gamma.md", "c"],
  ]);
  const { writes, stale } = planSync(
    desired,
    onDisk,
    new Set(["alpha.md", "beta.ja.md"]),
  );
  assert.deepEqual(
    writes.map((page) => page.pageName),
    ["alpha.md", "beta.ja.md"],
  );
  assert.deepEqual(stale, ["gamma.md"]);
});

test("planSync reports no work when pages already match", () => {
  const desired = [
    {
      pageName: "alpha.md",
      pagePath: path.join(docsPluginsRoot, "alpha.md"),
      content: "a",
    },
  ];
  const { writes, stale } = planSync(
    desired,
    new Map([["alpha.md", "a"]]),
    new Set(["alpha.md"]),
  );
  assert.deepEqual(writes, []);
  assert.deepEqual(stale, []);
});

test("does not remove a generated page when its required source is missing", () => {
  const onDisk = new Map([["alpha.ja.md", "generated"]]);
  const { stale } = planSync([], onDisk, new Set(["alpha.md", "alpha.ja.md"]));
  assert.deepEqual(stale, []);
});

test("ignores manually maintained pages when finding generated output", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-plugin-docs-"),
  );
  fs.writeFileSync(path.join(root, "manual.md"), "# Manual\n");
  fs.writeFileSync(
    path.join(root, "generated.md"),
    `${generatedMarker("generated")}\n`,
  );
  assert.deepEqual([...readGeneratedPages(root).keys()], ["generated.md"]);
});

function countTopLevelHeadings(markdown) {
  let open = null;
  let count = 0;
  for (const line of markdown.split(/\r?\n/)) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      const length = fence[1].length;
      const character = fence[1][0];
      if (open === null) open = { length, character };
      else if (character === open.character && length >= open.length)
        open = null;
      continue;
    }
    if (open === null && /^#\s/.test(line)) count += 1;
  }
  return count;
}

test("every generated Plugin page has exactly one top-level heading", () => {
  const { pages, errors } = buildDesiredPages();
  assert.deepEqual(errors, []);
  for (const page of pages) {
    assert.equal(
      countTopLevelHeadings(page.content),
      1,
      `${page.pageName} should expose exactly one H1`,
    );
  }
});

test("builds one generated page for each README language", () => {
  const { pages, errors } = buildDesiredPages();
  assert.deepEqual(errors, []);
  assert.equal(pages.length, 140);
  assert.ok(pages.some((page) => page.pageName === "diff.md"));
  const japanese = pages.find((page) => page.pageName === "diff.ja.md");
  assert.ok(japanese);
  assert.ok(japanese.content.includes(generatedMarker("diff", "README_ja.md")));
});
