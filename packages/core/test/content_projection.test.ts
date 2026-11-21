import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createEntryExcerpt,
  extractHtmlHeadings,
  getEntryPlainText,
  isExcludedSlugPath,
} from "../src/content/content_projection.js";

test("isExcludedSlugPath matches the slug, its descendants, and nothing else", () => {
  const excluded = ["private", "drafts/old"];

  assert.equal(isExcludedSlugPath("private", excluded), true);
  assert.equal(isExcludedSlugPath("private/child", excluded), true);
  assert.equal(isExcludedSlugPath("drafts/old", excluded), true);
  assert.equal(isExcludedSlugPath("drafts/older", excluded), false);
  assert.equal(isExcludedSlugPath("drafts", excluded), false);
  assert.equal(isExcludedSlugPath("public", excluded), false);
  assert.equal(isExcludedSlugPath("", []), false);
});

test("getEntryPlainText prefers the manifest plainText over re-derived HTML", () => {
  assert.equal(
    getEntryPlainText({ html: "<p>html</p>", plainText: "cached" }),
    "cached",
  );
  assert.equal(
    getEntryPlainText({ html: "<p>hello world</p>" }),
    "hello world",
  );
});

test("createEntryExcerpt prefers a non-empty description and falls back to the body", () => {
  const description = "  A hand-written summary.  ";
  assert.equal(
    createEntryExcerpt({
      frontmatter: { description },
      html: "<p>ignored</p>",
    }),
    "A hand-written summary.",
  );
  assert.equal(
    createEntryExcerpt({ frontmatter: {}, html: "<p>body text</p>" }),
    "body text",
  );
  assert.equal(
    createEntryExcerpt({
      frontmatter: { description: "   " },
      html: "<p>fallback</p>",
    }),
    "fallback",
  );
  assert.equal(
    createEntryExcerpt(
      { frontmatter: {}, html: `<p>${"x".repeat(200)}</p>` },
      10,
    ),
    "x".repeat(10),
  );
});

test("extractHtmlHeadings keeps heading levels up to four as plain text", () => {
  const html = [
    "<h1>Title <em>part</em></h1>",
    "<h2>Section</h2>",
    "<h3>Sub</h3>",
    "<h4>Deep</h4>",
    "<h5>Too deep</h5>",
    "<h2 class='x'>Skips <code>code</code> markup</h2>",
    "<h2></h2>",
  ].join("");
  assert.deepEqual(extractHtmlHeadings(html), [
    "Title part",
    "Section",
    "Sub",
    "Deep",
    "Skips code markup",
  ]);
  assert.deepEqual(extractHtmlHeadings("<p>no headings</p>"), []);
});
