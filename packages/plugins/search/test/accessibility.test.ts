import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const component = readFileSync(
  new URL("../components/search-bar.tsx", import.meta.url),
  "utf8",
);
const client = readFileSync(
  new URL("../src/search-bar.client.ts", import.meta.url),
  "utf8",
);
const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("search modal uses the native dialog element with a labelled name", () => {
  assert.match(component, /<dialog/);
  assert.match(component, /id="search-dialog"/);
  assert.match(component, /aria-labelledby="search-title"/);
  assert.match(component, /id="search-title"/);
  assert.doesNotMatch(component, /role="dialog"/);
  assert.doesNotMatch(component, /aria-modal/);
});

test("search trigger exposes dialog expanded state", () => {
  assert.match(component, /aria-haspopup="dialog"/);
  assert.match(component, /aria-controls="search-dialog"/);
  assert.match(component, /aria-expanded="false"/);
  assert.match(client, /setOpenButtonState\(openButtons, true\)/);
  assert.match(client, /setOpenButtonState\(openButtons, false\)/);
});

test("search results expose list semantics and a live status", () => {
  assert.match(component, /data-search-results[\s\S]*?role="listbox"/);
  assert.match(component, /aria-label="Search results"/);
  assert.match(component, /data-search-status role="status"/);
});

test("search opens as a modal and closes through the dialog API", () => {
  assert.match(client, /modal\.showModal\(\)/);
  assert.match(client, /modal\.close\(\)/);
  assert.match(client, /if \(modal\.open\) return;/);
  assert.match(client, /if \(!modal\.open\) return;/);
  assert.doesNotMatch(client, /modal\.hidden/);
});

test("search keeps Tab focus inside the dialog boundaries", () => {
  assert.match(client, /FOCUSABLE_SELECTOR/);
  assert.match(client, /event\.shiftKey && document\.activeElement === first/);
  assert.match(client, /document\.activeElement === last/);
});

test("search closes on Escape and on backdrop pointer clicks", () => {
  assert.match(client, /event\.key === "Escape"/);
  assert.match(client, /event\.target === modal/);
});

test("search restores focus to the opener when closed", () => {
  assert.match(client, /previouslyFocused = document\.activeElement/);
  assert.match(client, /if \(target\?\.isConnected\) target\.focus\(\)/);
  assert.match(client, /previouslyFocused = null/);
});

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

test("search opens with a query from the URL", () => {
  assert.match(client, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(client, /input\.value = initialQuery/);
  assert.match(client, /void openSearch\(\)/);
});
