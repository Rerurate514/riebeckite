import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWebLocale } from "../app/lib/locale";

test("resolveWebLocale recognizes japanese tags and falls back to english", () => {
  assert.equal(resolveWebLocale("ja"), "ja");
  assert.equal(resolveWebLocale("ja-JP"), "ja");
  assert.equal(resolveWebLocale("ja_JP"), "ja");
  assert.equal(resolveWebLocale("JA-jp"), "ja");
  assert.equal(resolveWebLocale("en"), "en");
  assert.equal(resolveWebLocale("en-US"), "en");
  assert.equal(resolveWebLocale("fr"), "en");
  assert.equal(resolveWebLocale(undefined), "en");
});
