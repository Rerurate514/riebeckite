import assert from "node:assert/strict";
import { test } from "node:test";
import { vegaLite } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(
    vegaLite().validateOptions?.({ renderer: "webgl" } as never),
    [{ path: "renderer", message: 'Expected "canvas" or "svg".' }],
  );
});
