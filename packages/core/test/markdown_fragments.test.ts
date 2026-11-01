import assert from "node:assert/strict";
import { test } from "node:test";
import { selectEmbedMarkdownFragment } from "../src/markdown_fragments.js";

test("selects a heading section until the next peer heading", () => {
  const markdown = [
    "# Intro",
    "",
    "Intro text.",
    "",
    "## Section",
    "",
    "First.",
    "",
    "### Child",
    "",
    "Nested.",
    "",
    "## Next",
    "",
    "Outside.",
  ].join("\n");

  const selected = selectEmbedMarkdownFragment(markdown, {
    kind: "heading",
    value: "Section",
  });

  assert.ok(selected);
  assert.match(selected, /First\./);
  assert.match(selected, /Nested\./);
  assert.doesNotMatch(selected, /Outside\./);
  assert.doesNotMatch(selected, /Intro text\./);
});

test("matches heading names without case or whitespace differences", () => {
  const markdown = "##  My   Section \n\nBody.";

  const selected = selectEmbedMarkdownFragment(markdown, {
    kind: "heading",
    value: "my section",
  });

  assert.ok(selected);
  assert.match(selected, /Body\./);
});

test("selects a block marked at the end of a paragraph", () => {
  const markdown = "First.\n\nBlock text ^alpha\n\nThird.";

  const selected = selectEmbedMarkdownFragment(markdown, {
    kind: "block",
    value: "alpha",
  });

  assert.equal(selected, "Block text ^alpha");
});

test("selects a blockquote marked on the following line", () => {
  const markdown = "Before.\n\n> Quoted\n> Lines\n\n^quote\n\nAfter.";

  const selected = selectEmbedMarkdownFragment(markdown, {
    kind: "block",
    value: "quote",
  });

  assert.equal(selected, "> Quoted\n> Lines");
});

test("selects a whole list marked after a blank line", () => {
  const markdown = "- one\n  - nested\n- two\n\n^items\n\nAfter.";

  const selected = selectEmbedMarkdownFragment(markdown, {
    kind: "block",
    value: "items",
  });

  assert.equal(selected, "- one\n  - nested\n- two");
});

test("keeps the marker when it belongs to the last list item", () => {
  const markdown = "- one\n- two\n^last";

  const selected = selectEmbedMarkdownFragment(markdown, {
    kind: "block",
    value: "last",
  });

  assert.equal(selected, "- two\n^last");
});

test("ignores block markers inside code blocks", () => {
  const markdown = "```\n^hidden\n```\n\nText ^real";

  const selected = selectEmbedMarkdownFragment(markdown, {
    kind: "block",
    value: "hidden",
  });

  assert.equal(selected, null);
});

test("returns the full note without a fragment and null when missing", () => {
  const markdown = "# Note\n\nBody.";

  assert.equal(selectEmbedMarkdownFragment(markdown, null), markdown);
  assert.equal(
    selectEmbedMarkdownFragment(markdown, { kind: "heading", value: "Nope" }),
    null,
  );
  assert.equal(
    selectEmbedMarkdownFragment(markdown, { kind: "block", value: "nope" }),
    null,
  );
});
