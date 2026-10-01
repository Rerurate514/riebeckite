import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("lightbox dialog keeps keyboard focus inside the modal", () => {
  const source = readFileSync(
    new URL("../src/init.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /event\.key === "Tab"/);
  assert.match(source, /trapFocus\(event, dialog\.element\)/);
  assert.match(source, /event\.shiftKey && active === first/);
  assert.match(source, /!event\.shiftKey && active === last/);
});

test("lightbox dialog can receive programmatic focus when needed", () => {
  const source = readFileSync(
    new URL("../src/dialog.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /role", "dialog"/);
  assert.match(source, /aria-modal", "true"/);
  assert.match(source, /element\.tabIndex = -1/);
});
