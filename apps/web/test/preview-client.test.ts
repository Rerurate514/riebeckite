import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("../app/preview-client.ts", import.meta.url),
  "utf8",
);

test("preview client injects content and registered plugin styles", () => {
  for (const stylesheet of [
    "@riebeckite/honox/style.css?inline",
    "./components/article/style.css?inline",
    "./styles/markdown.css?inline",
    "@riebeckite/plugin-autocardlink/style.css?inline",
    "@riebeckite/plugin-code-enhance/style.css?inline",
    "@riebeckite/plugin-code-tabs/style.css?inline",
    "@riebeckite/plugin-highlight/style.css?inline",
    "@riebeckite/plugin-lightbox/style.css?inline",
    "@riebeckite/plugin-obsidian-markdown/style.css?inline",
    "@riebeckite/plugin-shortcodes/style.css?inline",
    "@riebeckite/plugin-sidenotes/style.css?inline",
  ]) {
    assert.match(source, new RegExp(escapeRegExp(stylesheet)));
  }
  assert.match(
    source,
    /contentStyles: \[frameworkStyle, articleStyle, markdownStyle\]/,
  );
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
