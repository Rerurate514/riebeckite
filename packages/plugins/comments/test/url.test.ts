import assert from "node:assert/strict";
import { test } from "node:test";
import { isSafeImageUrl, isSafeLinkUrl } from "../src/url.js";

test("isSafeLinkUrl allows http and https", () => {
  assert.equal(isSafeLinkUrl("https://example.com"), true);
  assert.equal(isSafeLinkUrl("http://example.com"), true);
});

test("isSafeLinkUrl rejects dangerous schemes", () => {
  assert.equal(isSafeLinkUrl("javascript:alert(1)"), false);
  assert.equal(isSafeLinkUrl("data:text/html,<script>"), false);
  assert.equal(isSafeLinkUrl("vbscript:msgbox(1)"), false);
});

test("isSafeLinkUrl rejects invalid URLs and empty", () => {
  assert.equal(isSafeLinkUrl("not a url"), false);
  assert.equal(isSafeLinkUrl(""), false);
  assert.equal(isSafeLinkUrl(undefined), false);
});

test("isSafeImageUrl allows https and data:image", () => {
  assert.equal(isSafeImageUrl("https://example.com/a.png"), true);
  assert.equal(isSafeImageUrl("data:image/png;base64,AAAA"), true);
});

test("isSafeImageUrl rejects dangerous schemes", () => {
  assert.equal(isSafeImageUrl("javascript:alert(1)"), false);
  assert.equal(isSafeImageUrl("data:text/html,<script>"), false);
  assert.equal(isSafeImageUrl(undefined), false);
});
