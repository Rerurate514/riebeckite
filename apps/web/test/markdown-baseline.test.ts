import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const styleCss = read("../app/style.css");
const markdownCss = read("../app/styles/markdown.css");
const wikilinksCss = read("../app/styles/wikilinks.css");
const articleTsx = read("../app/components/article/article.tsx");
const themeCss = readdirSync(
  fileURLToPath(new URL("../../../packages/themes", import.meta.url)),
  { withFileTypes: true },
)
  .filter((entry) => entry.isDirectory())
  .map((entry) =>
    read(`../../../packages/themes/${entry.name}/styles/theme.css`),
  );

test("apps/web no longer depends on the typography plugin", () => {
  assert.doesNotMatch(styleCss, /@tailwindcss\/typography/);
  assert.doesNotMatch(styleCss, /@plugin/);
  assert.match(styleCss, /@import "\.\/styles\/markdown\.css";/);
});

test("articles expose the rb-article-content markdown hook instead of prose", () => {
  assert.doesNotMatch(articleTsx, /class="prose"/);
  assert.doesNotMatch(wikilinksCss, /\.prose\b/);
  assert.match(articleTsx, /class="rb-article-content"/);
});

test("markdown typography stays scoped to rendered markdown, not plugin slots", () => {
  assert.doesNotMatch(markdownCss, /\.rb-article-body/);
  assert.doesNotMatch(wikilinksCss, /\.rb-article-body/);
  assert.match(markdownCss, /\.rb-article-content/);
});

test("official themes scope markdown typography to rendered markdown", () => {
  assert.ok(themeCss.length > 0);
  for (const css of themeCss) {
    assert.doesNotMatch(css, /\.rb-article-body/);
    assert.match(css, /\.rb-article-content/);
  }
});

test("markdown baseline restores list semantics removed by preflight", () => {
  assert.match(
    markdownCss,
    /\.rb-article-content :where\(ul\)\s*\{[^}]*list-style-type: disc/,
  );
  assert.match(
    markdownCss,
    /\.rb-article-content :where\(ol\)\s*\{[^}]*list-style-type: decimal/,
  );
  assert.match(markdownCss, /padding-inline-start: 1\.625em/);
});

test("markdown baseline owns table, figure, definition list, and kbd defaults", () => {
  assert.match(markdownCss, /\.rb-article-content :where\(table\)/);
  assert.match(markdownCss, /\.rb-article-content :where\(figure\)/);
  assert.match(markdownCss, /\.rb-article-content :where\(figcaption\)/);
  assert.match(markdownCss, /\.rb-article-content :where\(kbd\)/);
  assert.match(markdownCss, /\.rb-article-content :where\(dl\)/);
  assert.match(markdownCss, /\.rb-article-content :where\(dd\)/);
  assert.match(
    markdownCss,
    /\.rb-article-content :where\(img, picture, video\)/,
  );
});

test("markdown baseline covers text-level, heading, block, and task list defaults", () => {
  assert.match(
    markdownCss,
    /\.rb-article-content :where\(h1, h2, h3, h4, h5, h6\)/,
  );
  assert.match(markdownCss, /\.rb-article-content :where\(p\)/);
  assert.match(markdownCss, /\.rb-article-content :where\(a\)/);
  assert.match(markdownCss, /\.rb-article-content :where\(strong\)/);
  assert.match(markdownCss, /\.rb-article-content :where\(blockquote\)/);
  assert.match(
    markdownCss,
    /\.rb-article-content :where\(:not\(pre\) > code\)/,
  );
  assert.match(
    markdownCss,
    /\.rb-article-content :where\(pre\):not\(:where\(\.rr-code \*\)\)/,
  );
  assert.match(markdownCss, /\.task-list-item/);
});

test("markdown baseline never generates inline code backticks", () => {
  assert.doesNotMatch(markdownCss, /`/);
  assert.doesNotMatch(markdownCss, /code::before|code::after/);
});
