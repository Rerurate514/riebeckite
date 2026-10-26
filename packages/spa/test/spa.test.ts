import assert from "node:assert/strict";
import test from "node:test";
import { spa } from "../index.js";

test("spa freezes validated navigation options", () => {
  const options = spa({ prefetch: "hover", scrollRestoration: true });

  assert.ok(Object.isFrozen(options));
});

test("spa rejects invalid navigation options", () => {
  assert.throws(
    () => spa({ prefetch: "eager" as never }),
    /prefetch must be false or "hover"/,
  );
});
