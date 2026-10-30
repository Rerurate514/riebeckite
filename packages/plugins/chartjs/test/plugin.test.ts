import assert from "node:assert/strict";
import { test } from "node:test";
import { chartjs } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(
    chartjs().validateOptions?.({ responsive: "yes" } as never),
    [{ path: "responsive", message: "Expected a boolean." }],
  );
});
