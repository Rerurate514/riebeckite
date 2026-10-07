import assert from "node:assert/strict";
import { test } from "node:test";
import { scanMarkdownFenceLines } from "../src/utils/markdown.js";

test("scanMarkdownFenceLines flags lines inside backtick fences", () => {
  const scan = scanMarkdownFenceLines(
    ["before", "```js", "const a = 1;", "```", "after"].join("\n"),
  );

  assert.deepEqual(
    scan.map((line) => line.inFence),
    [false, false, true, false, false],
  );
});

test("scanMarkdownFenceLines keeps an inner fence open inside a longer outer fence", () => {
  const scan = scanMarkdownFenceLines(
    ["`````", "```md", "```js", "const a = 1;", "```", "`````"].join("\n"),
  );

  assert.deepEqual(
    scan.map((line) => line.inFence),
    [false, true, true, true, true, false],
  );
});

test("scanMarkdownFenceLines honours tilde fences and closing length", () => {
  const tilde = scanMarkdownFenceLines(["~~~", "content", "~~~"].join("\n"));
  assert.deepEqual(
    tilde.map((line) => line.inFence),
    [false, true, false],
  );

  const long = scanMarkdownFenceLines(
    ["````", "```", "still inside", "````", "outside"].join("\n"),
  );
  assert.deepEqual(
    long.map((line) => line.inFence),
    [false, true, true, false, false],
  );
});

test("scanMarkdownFenceLines keeps the source lines untouched", () => {
  const scan = scanMarkdownFenceLines("a\n\nb");
  assert.deepEqual(
    scan.map((line) => line.value),
    ["a", "", "b"],
  );
});
