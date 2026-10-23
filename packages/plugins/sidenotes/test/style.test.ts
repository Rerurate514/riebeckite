import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("footnote definitions stay visible at the end of the article", () => {
  assert.match(
    style,
    /\.rr-sidenotes__footnotes \{[\s\S]*?border-block-start: var\(--rb-rule-width, 1px\) solid var\(--rr-sidenotes-rule\);/,
  );
  assert.doesNotMatch(style, /\.rr-sidenotes__footnotes \{\s*display: none;/);
  assert.match(
    style,
    /\.rr-sidenotes__footnotes\[data-rr-sidenotes-placement="margin"\] \{\s*display: none;/,
  );
});

test("margin notes stay in flow until an article rail fits", () => {
  assert.doesNotMatch(style, /@media \(max-width: 48rem\)/);
  assert.doesNotMatch(style, /position: fixed/);
  assert.match(
    style,
    /@media \(min-width: 88rem\) \{[\s\S]*?\.rr-sidenotes__note \{[\s\S]*?position: sticky;[\s\S]*?width: min\([\s\S]*?var\(--rr-sidenotes-width, 16rem\)[\s\S]*?margin-inline-start: calc\(100% \+ var\(--rb-space-3, 1.5rem\)\);/,
  );
});
