import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("sidenotes stay in flow until an article rail fits", () => {
  assert.match(
    style,
    /@media \(min-width: 48rem\) \{[\s\S]*?\.rr-sidenotes__note \{[\s\S]*?max-inline-size: 100%;[\s\S]*?\.rr-sidenotes__footnotes \{[\s\S]*?display: none;/,
  );
  assert.match(
    style,
    /@media \(min-width: 88rem\) \{[\s\S]*?\.rr-sidenotes__note \{[\s\S]*?position: sticky;[\s\S]*?width: min\([\s\S]*?var\(--rr-sidenotes-width, 16rem\)[\s\S]*?margin-inline-start: calc\(100% \+ var\(--rb-space-3, 1.5rem\)\);/,
  );
});
