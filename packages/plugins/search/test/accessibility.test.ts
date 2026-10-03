import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("search trigger exposes dialog expanded state", () => {
  const component = readFileSync(
    new URL("../components/search-bar.tsx", import.meta.url),
    "utf8",
  );
  const client = readFileSync(
    new URL("../src/search-bar.client.ts", import.meta.url),
    "utf8",
  );

  assert.match(component, /aria-expanded="false"/);
  assert.match(client, /setOpenButtonState\(openButtons, true\)/);
  assert.match(client, /setOpenButtonState\(openButtons, false\)/);
});

test("search restores focus to the opener when closed", () => {
  const source = readFileSync(
    new URL("../src/search-bar.client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /previouslyFocused = document\.activeElement/);
  assert.match(source, /previouslyFocused\?\.focus\(\)/);
  assert.match(source, /previouslyFocused = null/);
});

test("search opens with a query from the URL", () => {
  const source = readFileSync(
    new URL("../src/search-bar.client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(source, /input\.value = initialQuery/);
  assert.match(source, /void openSearch\(\)/);
});
