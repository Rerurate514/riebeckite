import assert from "node:assert/strict";
import { test } from "node:test";
import { fingerprintExternalValue } from "../src/content/external_fingerprint.js";

test("fingerprintExternalValue returns a stable digest for JSON values", () => {
  const first = fingerprintExternalValue({ slug: "note", tags: ["a"] });
  const second = fingerprintExternalValue({ tags: ["a"], slug: "note" });

  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("fingerprintExternalValue distinguishes different values", () => {
  assert.notEqual(
    fingerprintExternalValue({ slug: "note" }),
    fingerprintExternalValue({ slug: "other" }),
  );
});

test("fingerprintExternalValue rejects values without a JSON representation", () => {
  assert.throws(
    () => fingerprintExternalValue(undefined),
    /must be JSON serializable/,
  );
  assert.throws(
    () => fingerprintExternalValue(() => "value"),
    /must be JSON serializable/,
  );
});

test("fingerprintExternalValue rejects cyclic values", () => {
  const value: Record<string, unknown> = {};
  value.self = value;

  assert.throws(
    () => fingerprintExternalValue(value),
    /Cyclic values are not JSON serializable/,
  );
});
