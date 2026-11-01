import assert from "node:assert/strict";
import { test } from "node:test";
import { parseImageCompare } from "../index.ts";

test("parses required images and defaults", () => {
  const result = parseImageCompare("before: ./a.png\nafter: ./b.png\n");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.spec, {
    before: "./a.png",
    after: "./b.png",
    beforeAlt: "Before",
    afterAlt: "After",
    orientation: "horizontal",
  });
});

test("parses vertical orientation and labels", () => {
  const result = parseImageCompare(
    "before: ./a.png\nafter: ./b.png\norientation: vertical\nbeforeAlt: Draft\nafterAlt: Published\nlabel: Theme preview\n",
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.spec.orientation, "vertical");
  assert.equal(result.spec.beforeAlt, "Draft");
  assert.equal(result.spec.label, "Theme preview");
});

test("rejects missing images and invalid orientation", () => {
  assert.equal(parseImageCompare("after: ./b.png\n").ok, false);
  assert.equal(parseImageCompare("before: ./a.png\n").ok, false);
  assert.equal(
    parseImageCompare(
      "before: ./a.png\nafter: ./b.png\norientation: diagonal\n",
    ).ok,
    false,
  );
});

test("rejects invalid YAML", () => {
  const result = parseImageCompare("before: [\n");
  assert.equal(result.ok, false);
});
