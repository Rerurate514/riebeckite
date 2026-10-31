import assert from "node:assert/strict";
import { test } from "node:test";
import { extractLinkOccurrences } from "../index.js";

test("link occurrences retain UTF-16 source slices and Markdown destinations", () => {
  const source =
    '\uFEFF日本語 [emoji 😀](<docs/a%20b.md#見出し> "title")\r\n![[画像.png|表示]]';
  const occurrences = extractLinkOccurrences(source, {
    sourceContentId: "note-1",
    sourcePath: "notes/日本語.md",
  });
  assert.equal(occurrences.length, 2);
  const link = occurrences[0];
  assert.equal(link?.sourceContentId, "note-1");
  assert.equal(
    source.slice(link?.destinationRange?.start, link?.destinationRange?.end),
    "docs/a%20b.md#見出し",
  );
  assert.equal(link?.fragment, "#見出し");
  const embed = occurrences[1];
  assert.equal(embed?.syntax, "wiki-embed");
  assert.equal(
    source.slice(embed?.destinationRange?.start, embed?.destinationRange?.end),
    "画像.png",
  );
  assert.equal(embed?.alias, "表示");
});

test("link occurrences exclude code and distinguish reference occurrences", () => {
  const source =
    '`[[inline]]`\n```md\n[[fence]]\n```\n[ref][target]\n\n[target]: assets/a.png "asset"\n';
  const occurrences = extractLinkOccurrences(source);
  assert.deepEqual(
    occurrences.map((occurrence) => [
      occurrence.syntax,
      occurrence.rawDestination,
      occurrence.destinationRange !== undefined,
    ]),
    [
      ["reference-link", "target", false],
      ["reference-definition", "assets/a.png", true],
    ],
  );
});

test("link occurrences ignore escaped and malformed WikiLinks", () => {
  const occurrences = extractLinkOccurrences("\\[[escaped]] [[unterminated");
  assert.deepEqual(occurrences, []);
});
