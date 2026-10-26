import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("search keeps the closed dialog hidden and paints a backdrop", () => {
  assert.match(
    style,
    /\.rr-search-modal:not\(\[open\]\)\s*\{[^}]*display:\s*none/,
  );
  assert.match(
    style,
    /\.rr-search-modal::backdrop\s*\{[^}]*var\(--rr-search-overlay/,
  );
});
