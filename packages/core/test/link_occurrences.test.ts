import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractLinkOccurrences,
  linkResolutionKey,
  resolveLinkOccurrences,
  rewriteLinkDestinations,
} from "../index.js";

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

test("link occurrences locate destinations past nested images and code spans", () => {
  const source = "[![alt](img.png)](target.md) [see `a](b`](real.md)";
  const occurrences = extractLinkOccurrences(source);
  assert.deepEqual(
    occurrences.map((occurrence) => [
      occurrence.syntax,
      occurrence.rawDestination,
      source.slice(
        occurrence.destinationRange?.start,
        occurrence.destinationRange?.end,
      ),
    ]),
    [
      ["markdown-link", "target.md", "target.md"],
      ["markdown-image", "img.png", "img.png"],
      ["markdown-link", "real.md", "real.md"],
    ],
  );
});

test("image labels may contain link-shaped text", () => {
  const source = "![foo [bar](/url)](/url2)";
  const [image] = extractLinkOccurrences(source);
  assert.equal(image?.syntax, "markdown-image");
  assert.equal(
    source.slice(image?.destinationRange?.start, image?.destinationRange?.end),
    "/url2",
  );
});

test("malformed percent escapes fall back to the raw destination", () => {
  const [occurrence] = extractLinkOccurrences("[x](50%.md)", {
    sourcePath: "a.md",
  });
  assert.ok(occurrence);
  assert.equal(linkResolutionKey(occurrence), "50%");
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

test("link occurrences resolve only unique canonical targets", () => {
  const occurrences = extractLinkOccurrences(
    "[[Note]] [relative](child.md) [ref][label]\n\n[label]: target.md",
    { sourcePath: "notes/source.md" },
  );
  const resolved = resolveLinkOccurrences(occurrences, {
    contentIndex: new Map([
      ["note", "notes/note"],
      ["notes/child", "notes/child"],
      ["notes/target", "notes/target"],
    ]),
  });
  assert.deepEqual(
    resolved.map((occurrence) => [
      occurrence.resolution,
      occurrence.target?.slug,
    ]),
    [
      ["resolved", "notes/note"],
      ["resolved", "notes/child"],
      ["resolved", "notes/target"],
      ["resolved", "notes/target"],
    ],
  );
  const ambiguous = resolveLinkOccurrences(
    extractLinkOccurrences("[[duplicate]]"),
    {
      contentIndex: new Map(),
      contentIndexAmbiguities: new Map([["duplicate", ["a", "b"]]]),
    },
  )[0];
  assert.equal(ambiguous?.resolution, "ambiguous");
  assert.deepEqual(
    ambiguous?.candidates?.map((candidate) => candidate.slug),
    ["a", "b"],
  );
});

test("link destination rewrites preserve surrounding syntax and reject drift", () => {
  const source = "[[old#section|label]] and [old](old.md#section)";
  const occurrences = extractLinkOccurrences(source);
  const rewritten = rewriteLinkDestinations(
    source,
    occurrences.flatMap((occurrence) =>
      occurrence.destinationRange
        ? [
            {
              range: occurrence.destinationRange,
              expected: occurrence.rawDestination,
              replacement: "new",
            },
          ]
        : [],
    ),
  );
  assert.deepEqual(rewritten, {
    ok: true,
    content: "[[new#section|label]] and [old](new)",
  });
  assert.deepEqual(
    rewriteLinkDestinations(source, [
      { range: { start: 0, end: 1 }, expected: "x", replacement: "" },
    ]),
    { ok: false, reason: "source-mismatch" },
  );
});
