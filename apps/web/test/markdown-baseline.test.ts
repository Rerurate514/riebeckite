import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const styleCss = read("../app/style.css");
const markdownCss = read("../../../packages/integrations/honox/style.css");

test("the Markdown baseline lives in the Honox integration", () => {
  assert.doesNotMatch(styleCss, /@tailwindcss\/typography/);
  assert.doesNotMatch(styleCss, /@plugin/);
  assert.doesNotMatch(styleCss, /styles\/markdown\.css/);
  assert.match(markdownCss, /\.rb-article-content/);
});

test("markdown typography stays scoped to rendered markdown, not plugin components", () => {
  assert.doesNotMatch(markdownCss, /\.rb-article-body\s+:where/);
  assert.match(markdownCss, /\.rb-article-content/);
});
