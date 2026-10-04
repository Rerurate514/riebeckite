import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const styleCss = read("../app/style.css");
const markdownCss = read("../app/styles/markdown.css");
const wikilinksCss = read("../app/styles/wikilinks.css");
const articleTsx = read("../app/components/article/article.tsx");

test("apps/web no longer depends on the typography plugin", () => {
  assert.doesNotMatch(styleCss, /@tailwindcss\/typography/);
  assert.doesNotMatch(styleCss, /@plugin/);
  assert.match(styleCss, /@import "\.\/styles\/markdown\.css";/);
});

test("articles expose the rb-article-body hook instead of prose", () => {
  assert.doesNotMatch(articleTsx, /class="prose"/);
  assert.doesNotMatch(wikilinksCss, /\.prose\b/);
});

test("markdown baseline restores list semantics removed by preflight", () => {
  assert.match(
    markdownCss,
    /\.rb-article-body :where\(ul\)\s*\{[^}]*list-style-type: disc/,
  );
  assert.match(
    markdownCss,
    /\.rb-article-body :where\(ol\)\s*\{[^}]*list-style-type: decimal/,
  );
  assert.match(markdownCss, /padding-inline-start: 1\.625em/);
});

test("markdown baseline owns table, figure, definition list, and kbd defaults", () => {
  assert.match(markdownCss, /\.rb-article-body :where\(table\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(figure\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(figcaption\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(kbd\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(dl\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(dd\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(img, picture, video\)/);
});

test("markdown baseline covers text-level, heading, block, and task list defaults", () => {
  assert.match(
    markdownCss,
    /\.rb-article-body :where\(h1, h2, h3, h4, h5, h6\)/,
  );
  assert.match(markdownCss, /\.rb-article-body :where\(p\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(a\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(strong\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(blockquote\)/);
  assert.match(markdownCss, /\.rb-article-body :where\(:not\(pre\) > code\)/);
  assert.match(
    markdownCss,
    /\.rb-article-body :where\(pre\):not\(:where\(\.rr-code \*\)\)/,
  );
  assert.match(markdownCss, /\.task-list-item/);
});

test("markdown baseline never generates inline code backticks", () => {
  assert.doesNotMatch(markdownCss, /`/);
  assert.doesNotMatch(markdownCss, /code::before|code::after/);
});
