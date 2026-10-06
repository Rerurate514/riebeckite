import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const shellCss = read("../app/styles/shell.css");
const articleCss = read("../app/components/article/style.css");
const tocCss = read("../../../packages/plugins/toc/style.css");

test("docs layout derives header height and sticky top from one contract", () => {
  assert.match(
    shellCss,
    /--rb-site-header-height:\s*calc\(var\(--rb-space-3\)\s*\*\s*3\)/,
  );
  assert.match(
    shellCss,
    /--rb-docs-sticky-top:\s*calc\(\s*var\(--rb-space-8\)\s*\+\s*var\(--rb-site-header-height\)\s*\)/,
  );
  assert.match(
    shellCss,
    /\.rb-site-header\s*\{[^}]*min-height:\s*var\(--rb-site-header-height\)/,
  );
});

test("left docs sidebar sticks at the shared docs sticky top", () => {
  assert.match(
    articleCss,
    /\.rb-article-aside\s*\{[^}]*position:\s*sticky;\s*top:\s*var\(--rb-docs-sticky-top\)/,
  );
  assert.match(
    articleCss,
    /max-height:\s*calc\(\s*100dvh\s*-\s*var\(--rb-docs-sticky-top\)\s*-\s*var\(--rb-space-8\)\s*\)/,
  );
});

test("desktop table of contents sticks at the shared docs sticky top", () => {
  assert.match(tocCss, /top:\s*var\(--rb-docs-sticky-top,\s*4rem\)/);
  assert.match(
    tocCss,
    /max-height:\s*calc\(\s*100dvh\s*-\s*var\(--rb-docs-sticky-top,\s*4rem\)\s*-\s*var\(--rb-space-8,\s*4rem\)\s*\)/,
  );
});
