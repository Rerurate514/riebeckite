import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentIndexBuilder,
  extractLinkOccurrences,
  linkResolutionKey,
  planContentLinkUpdates,
} from "../index.js";

test("relative links can climb out of a nested directory", () => {
  const [occurrence] = extractLinkOccurrences("[b](../../b.md)", {
    sourcePath: "deep/nested/a.md",
  });
  assert.ok(occurrence);
  assert.equal(linkResolutionKey(occurrence), "b");
});

test("percent-encoded destinations resolve to files with spaces", () => {
  const [occurrence] = extractLinkOccurrences("[b](docs/a%20b.md)", {
    sourcePath: "c.md",
  });
  assert.ok(occurrence);
  assert.equal(linkResolutionKey(occurrence), "docs/a b");
});

test("content indexes normalize uppercase Markdown extensions", () => {
  const built = ContentIndexBuilder.buildFromAliases(
    [{ path: "NOTES.MD" }],
    new Map(),
  );
  assert.equal(built.index.get("notes"), "NOTES");
});

test("retargeting rewrites WikiLinks and relative Markdown links", () => {
  const result = planContentLinkUpdates({
    files: new Map([
      ["notes/a.md", "[[old#part]] and [x](old.md#part)"],
      ["notes/new.md", "moved"],
    ]),
    retargets: [{ from: "notes/old.md", to: "notes/new.md" }],
  });
  assert.deepEqual(
    [...result.updates],
    [["notes/a.md", "[[notes/new#part]] and [x](new.md#part)"]],
  );
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.conflicts, []);
});

test("replacement destinations encode reserved path characters", () => {
  const result = planContentLinkUpdates({
    files: new Map([
      ["a.md", "[x](hash%23b.md)"],
      ["new name.md", "target"],
    ]),
    retargets: [{ from: "hash#b.md", to: "new name.md" }],
  });
  assert.deepEqual([...result.updates], [["a.md", "[x](new%20name.md)"]]);
});

test("retargeting rewrites assets that are not in the Markdown file map", () => {
  const result = planContentLinkUpdates({
    files: new Map([["a.md", "![[assets/old.svg]]"]]),
    retargets: [{ from: "assets/old.svg", to: "assets/new.svg" }],
    beforeIndex: new Map([["assets/old.svg", "assets/old.svg"]]),
    afterIndex: new Map([
      ["assets/new.svg", "assets/new.svg"],
      ["a", "a.md"],
    ]),
  });
  assert.deepEqual([...result.updates], [["a.md", "![[assets/new.svg]]"]]);
  assert.deepEqual(result.conflicts, []);
});

test("retargeting reports links to deleted and missing content", () => {
  const deleted = planContentLinkUpdates({
    files: new Map([
      ["a.md", "[[gone]]"],
      ["gone.md", "gone"],
    ]),
    retargets: [{ from: "gone.md" }],
  });
  assert.equal(deleted.warnings[0]?.code, "broken-link");

  const missing = planContentLinkUpdates({
    files: new Map([["a.md", "[[old]]"]]),
    retargets: [{ from: "old.md", to: "absent.md" }],
  });
  assert.equal(missing.conflicts[0]?.code, "link-target-missing");
});

test("retargeting does not guess between duplicate basenames", () => {
  const result = planContentLinkUpdates({
    files: new Map([
      ["notes/a.md", "[[old]] [[notes/old]]"],
      ["notes/old.md", "notes"],
      ["archive/old.md", "archive"],
      ["notes/new.md", "moved"],
    ]),
    retargets: [{ from: "notes/old.md", to: "notes/new.md" }],
  });
  assert.deepEqual(
    [...result.updates],
    [["notes/a.md", "[[old]] [[notes/new]]"]],
  );
  assert.deepEqual(result.conflicts, []);
});

test("deleting one of several duplicate basenames is not reported as broken", () => {
  const result = planContentLinkUpdates({
    files: new Map([
      ["a.md", "[[old]]"],
      ["archive/old.md", "archive"],
    ]),
    retargets: [{ from: "notes/old.md" }],
  });
  assert.equal(result.updates.size, 0);
  assert.deepEqual(result.warnings, []);
});

test("ambiguous links that resolve after a mutation are refused", () => {
  const result = planContentLinkUpdates({
    files: new Map([
      ["a.md", "[[note]]"],
      ["notes/note.md", "note"],
    ]),
    retargets: [],
    beforeIndex: new Map([["notes/note", "notes/note"]]),
    afterIndex: new Map([["note", "notes/note"]]),
    beforeAmbiguities: new Map([
      ["note", ["archive/note.md", "notes/note.md"]],
    ]),
    afterAmbiguities: new Map(),
  });
  assert.equal(result.conflicts[0]?.code, "link-target-ambiguous");
});

test("links ambiguous before and after a mutation are left untouched", () => {
  const result = planContentLinkUpdates({
    files: new Map([
      ["a.md", "[[note]]"],
      ["x/note.md", "x"],
      ["y/note.md", "y"],
    ]),
    retargets: [],
    beforeAmbiguities: new Map([["note", ["x/note.md", "y/note.md"]]]),
    afterAmbiguities: new Map([["note", ["x/note.md", "y/note.md"]]]),
  });
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.updates.size, 0);
});

test("moving a file with an ambiguous relative link is refused", () => {
  const result = planContentLinkUpdates({
    files: new Map([
      ["deep/a.md", "[x](old.md)"],
      ["x/old.md", "x"],
      ["y/old.md", "y"],
    ]),
    retargets: [{ from: "a.md", to: "deep/a.md" }],
    beforeAmbiguities: new Map([["old", ["x/old.md", "y/old.md"]]]),
    afterAmbiguities: new Map([
      ["deep/old", ["deep/x/old.md", "deep/y/old.md"]],
    ]),
  });
  assert.equal(result.conflicts[0]?.code, "link-target-ambiguous");
});

test("retargeting reports links whose resolution changes without a rewrite", () => {
  const ambiguous = planContentLinkUpdates({
    files: new Map([["a.md", "[[note]]"]]),
    retargets: [],
    beforeIndex: new Map([["note", "note"]]),
    afterIndex: new Map([["other/note", "other/note"]]),
  });
  assert.equal(ambiguous.conflicts[0]?.code, "link-broken");

  const repointed = planContentLinkUpdates({
    files: new Map([["a.md", "[[note]]"]]),
    retargets: [],
    beforeIndex: new Map([["note", "note"]]),
    afterIndex: new Map([["note", "other/note"]]),
  });
  assert.equal(repointed.conflicts[0]?.code, "link-target-changed");
});

test("retargeting ignores unrelated and external destinations", () => {
  const result = planContentLinkUpdates({
    files: new Map([
      ["a.md", "[[other]] [web](https://example.com/old.md)"],
      ["new.md", "new"],
    ]),
    retargets: [{ from: "old.md", to: "new.md" }],
  });
  assert.equal(result.updates.size, 0);
  assert.equal(result.warnings.length, 0);
});
