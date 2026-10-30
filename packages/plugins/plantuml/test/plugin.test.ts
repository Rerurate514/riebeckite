import assert from "node:assert/strict";
import { test } from "node:test";
import { plantuml } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(
    plantuml().validateOptions?.({ server: "/plantuml" } as never),
    [{ path: "server", message: "Expected an absolute http(s) URL." }],
  );
});
