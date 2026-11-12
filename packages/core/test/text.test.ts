import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlToPlainText } from "../index.js";

test("htmlToPlainText decodes entities after removing markup", () => {
  assert.equal(
    htmlToPlainText(
      "<h1>A &amp; B &#x1F600; &hellip;</h1><p>&lt;script&gt; is text</p>",
    ),
    "A & B 😀 … <script> is text",
  );
});

test("htmlToPlainText decodes exactly once", () => {
  assert.equal(htmlToPlainText("<p>&amp;lt; &amp;amp;</p>"), "&lt; &amp;");
});
