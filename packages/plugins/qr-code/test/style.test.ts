import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

function block(selector: string): string {
  const start = style.indexOf(`${selector} {`);
  assert.ok(start >= 0, `missing rule for ${selector}`);
  const end = style.indexOf("}", start);
  return style.slice(start + selector.length + 2, end);
}

test("no disclosure-widget selectors remain", () => {
  assert.equal(style.includes("rb-qr__fallback"), false);
  assert.equal(style.includes("summary"), false);
  assert.equal(style.includes('data-qr="pending"'), false);
});

test("the card width is anchored to the QR size, not the payload", () => {
  const card = block(".rb-qr");
  assert.match(card, /--rb-qr-size/);
  assert.match(card, /inline-size:\s*calc\(/);
  assert.match(card, /max-inline-size:\s*100%/);
});

test("the payload wraps instead of widening the card", () => {
  const source = block(".rb-qr__source");
  assert.match(source, /overflow-wrap:\s*anywhere/);
  assert.match(source, /word-break:\s*break-word/);
  assert.match(source, /min-inline-size:\s*0/);
});
