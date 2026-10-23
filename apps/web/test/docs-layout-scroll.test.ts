import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const shellCss = read("../app/styles/shell.css");
const articleCss = read("../app/components/article/style.css");

test("docs layout derives header height and rail bounds from one contract", () => {
  assert.match(shellCss, /--rb-site-header-logo-size:\s*1\.75rem/);
  assert.match(
    shellCss,
    /--rb-site-header-height:\s*calc\(\s*var\(--rb-space-3\)\s*\*\s*2\s*\+\s*var\(--rb-site-header-logo-size\)\s*\+\s*var\(--rb-rule-width,\s*1px\)\s*\)/,
  );
  assert.match(
    shellCss,
    /--rb-docs-rail-top:\s*calc\(\s*var\(--rb-space-8\)\s*\+\s*var\(--rb-site-header-height\)\s*\)/,
  );
  assert.match(
    shellCss,
    /--rb-docs-rail-max-block-size:\s*calc\(\s*100dvh\s*-\s*var\(--rb-docs-rail-top\)\s*-\s*var\(--rb-space-8\)\s*\)/,
  );
  assert.match(
    shellCss,
    /\.rb-site-header\s*\{[^}]*height:\s*var\(--rb-site-header-height\)/,
  );
  assert.doesNotMatch(
    shellCss,
    /\.rb-site-header\s*\{[^}]*min-height:\s*var\(--rb-site-header-height\)/,
  );
  assert.match(
    shellCss,
    /\.rb-site-header\s*\{[^}]*border-bottom:\s*var\(--rb-rule-width,\s*1px\)/,
  );
  assert.match(
    shellCss,
    /\.rb-site-header__home img\s*\{[^}]*width:\s*var\(--rb-site-header-logo-size\)[^}]*height:\s*var\(--rb-site-header-logo-size\)/,
  );
});

test("left docs sidebar uses the shared rail bounds", () => {
  assert.match(
    articleCss,
    /\.rb-article-aside\s*\{[^}]*position:\s*sticky;\s*top:\s*var\(--rb-docs-rail-top\)/,
  );
  assert.match(
    articleCss,
    /max-height:\s*var\(--rb-docs-rail-max-block-size\)/,
  );
});

test("desktop table of contents uses the shared rail bounds", () => {
  assert.match(articleCss, /top:\s*var\(--rb-docs-rail-top\)/);
  assert.match(
    articleCss,
    /max-height:\s*var\(--rb-docs-rail-max-block-size\)/,
  );
  assert.match(articleCss, /padding-block:\s*0/);
  assert.doesNotMatch(articleCss, /--rb-docs-sticky-top/);
  assert.doesNotMatch(articleCss, /--rr-toc-sticky-top/);
});
