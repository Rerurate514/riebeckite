import assert from "node:assert/strict";
import test from "node:test";
import { parseCommand } from "../src/cli.js";

test("doctor accepts diagnostic output options", () => {
  assert.deepEqual(parseCommand(["doctor"]), {
    name: "doctor",
    explain: false,
    json: false,
    fix: false,
    dryRun: false,
  });
  assert.deepEqual(
    parseCommand(["doctor", "--explain", "--fix", "--dry-run"]),
    {
      name: "doctor",
      explain: true,
      json: false,
      fix: true,
      dryRun: true,
    },
  );
});

test("doctor rejects incompatible or unknown options", () => {
  assert.throws(() => parseCommand(["doctor", "--dry-run"]));
  assert.throws(() => parseCommand(["doctor", "--json", "--explain"]));
  assert.throws(() => parseCommand(["doctor", "--json", "--fix"]));
  assert.throws(() => parseCommand(["doctor", "--github"]));
});
