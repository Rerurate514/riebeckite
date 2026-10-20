import assert from "node:assert/strict";
import test from "node:test";
import { parseCommand } from "../src/cli.js";

test("doctor accepts an explicit GitHub diagnostic", () => {
  assert.deepEqual(parseCommand(["doctor"]), {
    name: "doctor",
    github: false,
  });
  assert.deepEqual(parseCommand(["doctor", "--github"]), {
    name: "doctor",
    github: true,
  });
});
