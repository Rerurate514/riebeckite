import assert from "node:assert/strict";
import { test } from "node:test";
import { createLineDiff } from "../index.ts";

test("createLineDiff returns no lines for empty input", () => {
  assert.deepEqual(createLineDiff("", ""), []);
});

test("createLineDiff marks identical content as context", () => {
  assert.deepEqual(createLineDiff("x\ny", "x\ny"), [
    { type: "context", content: "x", oldLineNumber: 1, newLineNumber: 1 },
    { type: "context", content: "y", oldLineNumber: 2, newLineNumber: 2 },
  ]);
});

test("createLineDiff classifies context, removed, and added lines", () => {
  assert.deepEqual(createLineDiff("a\nb\nc", "a\nB\nc\nd"), [
    { type: "context", content: "a", oldLineNumber: 1, newLineNumber: 1 },
    { type: "removed", content: "b", oldLineNumber: 2, newLineNumber: null },
    { type: "added", content: "B", oldLineNumber: null, newLineNumber: 2 },
    { type: "context", content: "c", oldLineNumber: 3, newLineNumber: 3 },
    { type: "added", content: "d", oldLineNumber: null, newLineNumber: 4 },
  ]);
});

test("createLineDiff normalizes CRLF and lone CR line endings", () => {
  assert.deepEqual(createLineDiff("a\r\nb", "a\nc"), [
    { type: "context", content: "a", oldLineNumber: 1, newLineNumber: 1 },
    { type: "removed", content: "b", oldLineNumber: 2, newLineNumber: null },
    { type: "added", content: "c", oldLineNumber: null, newLineNumber: 2 },
  ]);
});
