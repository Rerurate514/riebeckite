import assert from "node:assert/strict";
import { test } from "node:test";
import { planContentLinkUpdates } from "../index.js";

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
