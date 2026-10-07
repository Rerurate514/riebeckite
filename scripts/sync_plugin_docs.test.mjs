import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  buildDesiredPages,
  GENERATED_MARKER_PREFIX,
  generatedMarker,
  planSync,
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
  assert.equal(rewriteTarget("./README_ja.md", options), "./shortcodes.md");
});

test("keeps anchors when rewriting the Japanese README link", () => {
  assert.equal(
    rewriteTarget("./README_ja.md#options", options),
    "./shortcodes.md#options",
  );
});

test("rewrites links into the docs tree as relative docs links", () => {
  assert.equal(
    rewriteTarget("../../../docs/docs/reference/plugin-api.en.md", options),
    "../reference/plugin-api.en.md",
  );
});

test("rewrites a cross-plugin English README to the generated docs page", () => {
  assert.equal(
    rewriteTarget("../code-enhance/README.md", options),
    "./code-enhance.en.md",
  );
});

test("rewrites a cross-plugin Japanese README to the Japanese docs page", () => {
  assert.equal(
    rewriteTarget("../code-enhance/README_ja.md", options),
    "./code-enhance.md",
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
  assert.ok(page.includes("See [日本語](./shortcodes.md)."));
  assert.ok(page.endsWith("\n"));
});

test("rewriteReadmeLinks does not rewrite links inside fenced code", () => {
  const text =
    "See [日本語](./README_ja.md).\n\n```md\n[日本語](./README_ja.md)\n```\n";
  const rewritten = rewriteReadmeLinks(text, options);
  assert.equal(
    rewritten,
    "See [日本語](./shortcodes.md).\n\n```md\n[日本語](./README_ja.md)\n```\n",
  );
});

test("planSync reports missing, outdated, and stale pages", () => {
  const desired = [
    {
      slug: "alpha",
      pagePath: path.join(docsPluginsRoot, "alpha.en.md"),
      content: "a",
    },
    {
      slug: "beta",
      pagePath: path.join(docsPluginsRoot, "beta.en.md"),
      content: "b",
    },
  ];
  const onDisk = new Map([
    ["alpha", "old"],
    ["gamma", "c"],
  ]);
  const { writes, stale } = planSync(desired, onDisk);
  assert.deepEqual(
    writes.map((page) => page.slug),
    ["alpha", "beta"],
  );
  assert.deepEqual(stale, ["gamma"]);
});

test("planSync reports no work when pages already match", () => {
  const desired = [
    {
      slug: "alpha",
      pagePath: path.join(docsPluginsRoot, "alpha.en.md"),
      content: "a",
    },
  ];
  const { writes, stale } = planSync(desired, new Map([["alpha", "a"]]));
  assert.deepEqual(writes, []);
  assert.deepEqual(stale, []);
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
  for (const page of buildDesiredPages()) {
    assert.equal(
      countTopLevelHeadings(page.content),
      1,
      `${page.slug}.en.md should expose exactly one H1`,
    );
  }
});
