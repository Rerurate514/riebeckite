import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGallery, resolveGalleryOptions } from "../index.ts";

const options = resolveGalleryOptions();

test("parses a valid block and applies plugin defaults", () => {
  const result = parseGallery(
    "items:\n  - title: Alpha\n    href: /a\n",
    options,
  );

  assert.equal(result.ok, true);
  if (result.ok !== true) return;
  assert.deepEqual(result.spec.items, [{ title: "Alpha", href: "/a" }]);
  assert.equal(result.spec.columns, 3);
  assert.equal(result.spec.aspect, "4/3");
  assert.deepEqual(result.warnings, []);
});

test("applies block-level columns and aspect overrides", () => {
  const result = parseGallery(
    'columns: 4\naspect: "16/9"\nitems:\n  - title: A\n',
    options,
  );

  assert.equal(result.ok, true);
  if (result.ok !== true) return;
  assert.equal(result.spec.columns, 4);
  assert.equal(result.spec.aspect, "16/9");
});

test("reports a body that is not a mapping", () => {
  const result = parseGallery("- a\n- b\n", options);

  assert.equal(result.ok, false);
  if (result.ok !== false) return;
  assert.match(result.reason, /mapping/);
});

test("reports a missing items list", () => {
  const result = parseGallery("columns: 2\n", options);

  assert.equal(result.ok, false);
  if (result.ok !== false) return;
  assert.match(result.reason, /items/);
});

test("reports invalid YAML", () => {
  const result = parseGallery("items: [1, 2\n", options);

  assert.equal(result.ok, false);
  if (result.ok !== false) return;
  assert.match(result.reason, /valid YAML/);
});

test("rejects an aspect value that could escape the style attribute", () => {
  const result = parseGallery(
    'aspect: "1/0;color:red"\nitems:\n  - title: A\n',
    options,
  );

  assert.equal(result.ok, false);
  if (result.ok !== false) return;
  assert.match(result.reason, /aspect/);
});

test("warns about items without a title or an image", () => {
  const result = parseGallery(
    "items:\n  - description: nothing to show\n  - title: Fine\n",
    options,
  );

  assert.equal(result.ok, true);
  if (result.ok !== true) return;
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0]?.code, "gallery-item-incomplete");
  assert.match(result.warnings[0]?.message ?? "", /item 1/);
});

test("coerces scalar field values to strings", () => {
  const result = parseGallery(
    "items:\n  - title: 42\n    meta: true\n",
    options,
  );

  assert.equal(result.ok, true);
  if (result.ok !== true) return;
  assert.deepEqual(result.spec.items, [{ title: "42", meta: "true" }]);
});
