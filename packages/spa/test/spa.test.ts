import assert from "node:assert/strict";
import test from "node:test";
import { validateSpaOptions } from "../options.js";

test("accepts valid navigation options", () => {
  assert.doesNotThrow(() =>
    validateSpaOptions({
      prefetch: "intent",
      scrollRestoration: true,
      viewTransitions: false,
    }),
  );
});

test("rejects invalid navigation options", () => {
  assert.throws(
    () => validateSpaOptions({ prefetch: "eager" as never }),
    /prefetch must be false, "hover", or "intent"/,
  );
});
