import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectCodeAnnotations,
  createEmptyPlan,
  deserializeAnnotations,
  encodeAnnotationsMeta,
  extractAnnotationsMeta,
  hasAnnotations,
  parseCodeAnnotations,
  parseLineRanges,
  serializeAnnotations,
  stripInlineCodeAnnotation,
} from "../index.ts";
import {
  appendAnnotationsMeta,
  normalizePlan,
  removeAnnotationsMeta,
} from "../src/annotations.ts";

test("parseLineRanges expands, orders, and filters ranges", () => {
  assert.deepEqual(parseLineRanges("1,3-5"), [1, 3, 4, 5]);
  assert.deepEqual(parseLineRanges("5-3"), [3, 4, 5]);
  assert.deepEqual(parseLineRanges("1, ,abc,2"), [1, 2]);
  assert.deepEqual(parseLineRanges(""), []);
});

test("parseCodeAnnotations reads highlight and focus groups", () => {
  assert.deepEqual(parseCodeAnnotations("{1,3-4} focus:{2}"), {
    highlight: [1, 3, 4],
    added: [],
    removed: [],
    focus: [2],
  });
  assert.deepEqual(parseCodeAnnotations("focus={2} {3,3,1}"), {
    highlight: [1, 3],
    added: [],
    removed: [],
    focus: [2],
  });
});

test("parseCodeAnnotations returns an empty plan for missing meta", () => {
  const empty = createEmptyPlan();
  assert.deepEqual(parseCodeAnnotations(null), empty);
  assert.deepEqual(parseCodeAnnotations(undefined), empty);
  assert.deepEqual(parseCodeAnnotations(""), empty);
});

test("stripInlineCodeAnnotation recognises prefixes and line counts", () => {
  assert.deepEqual(stripInlineCodeAnnotation("const a = 1; // [!code ++]"), {
    line: "const a = 1;",
    annotation: { kind: "added", lineCount: 1 },
  });
  assert.deepEqual(stripInlineCodeAnnotation("# [!code --]"), {
    line: "",
    annotation: { kind: "removed", lineCount: 1 },
  });
  assert.deepEqual(stripInlineCodeAnnotation("-- [!code highlight:2]"), {
    line: "",
    annotation: { kind: "highlight", lineCount: 2 },
  });
  assert.deepEqual(stripInlineCodeAnnotation("plain text"), {
    line: "plain text",
    annotation: null,
  });
});

test("collectCodeAnnotations merges meta and inline markers and strips them", () => {
  const collected = collectCodeAnnotations(
    "{1}",
    ["a // [!code ++]", "b", "c // [!code focus:2]"].join("\n"),
  );

  assert.equal(collected.hasAnnotations, true);
  assert.equal(collected.code, "a\nb\nc");
  assert.deepEqual(collected.plan, {
    highlight: [1],
    added: [1],
    removed: [],
    focus: [3, 4],
  });
});

test("collectCodeAnnotations leaves an unannotated block unchanged", () => {
  const collected = collectCodeAnnotations(null, "a\nb");

  assert.equal(collected.hasAnnotations, false);
  assert.equal(collected.code, "a\nb");
  assert.deepEqual(collected.plan, createEmptyPlan());
});

test("annotation plans serialize, coerce, and round-trip", () => {
  const plan = {
    highlight: [3, 1],
    added: [2],
    removed: [],
    focus: [4],
  };

  assert.deepEqual(normalizePlan(plan), {
    highlight: [1, 3],
    added: [2],
    removed: [],
    focus: [4],
  });
  assert.equal(hasAnnotations(createEmptyPlan()), false);
  assert.equal(hasAnnotations(null), false);

  const encoded = serializeAnnotations(plan);
  assert.deepEqual(deserializeAnnotations(encoded), normalizePlan(plan));
  assert.equal(deserializeAnnotations("not json"), null);
  assert.equal(deserializeAnnotations("[]"), null);
  assert.equal(deserializeAnnotations(""), null);
});

test("encoded meta tokens are extracted and removed cleanly", () => {
  const plan = parseCodeAnnotations("{1}");
  const encoded = encodeAnnotationsMeta(plan);

  assert.equal(extractAnnotationsMeta(encoded)?.highlight.join(","), "1");
  assert.equal(extractAnnotationsMeta("title=x"), null);
  assert.equal(extractAnnotationsMeta("rb-annotations=%7Bbad"), null);

  const combined = appendAnnotationsMeta("title=x", plan);
  assert.ok(combined.startsWith("title=x "));
  assert.equal(removeAnnotationsMeta(combined), "title=x");
});
