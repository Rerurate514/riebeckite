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
    failOn: undefined,
    codes: [],
  });
  assert.deepEqual(
    parseCommand(["doctor", "--explain", "--fix", "--dry-run"]),
    {
      name: "doctor",
      explain: true,
      json: false,
      fix: true,
      dryRun: true,
      failOn: undefined,
      codes: [],
    },
  );
});

test("doctor accepts exit thresholds and diagnostic code filters", () => {
  assert.deepEqual(
    parseCommand(["doctor", "--fail-on", "warning", "--code", "CONTENT_X"]),
    {
      name: "doctor",
      explain: false,
      json: false,
      fix: false,
      dryRun: false,
      failOn: "warning",
      codes: ["CONTENT_X"],
    },
  );
});

test("inspect content accepts an exact path or permalink", () => {
  assert.deepEqual(
    parseCommand(["inspect", "content", "--path", "/notes/hello/"]),
    {
      name: "inspect",
      target: "content",
      list: false,
      path: "/notes/hello/",
    },
  );
  assert.throws(() => parseCommand(["inspect", "content", "--path"]));
});

test("inspect provenance accepts shared state filters and JSON", () => {
  assert.deepEqual(
    parseCommand([
      "inspect",
      "provenance",
      "--json",
      "--source",
      "notes/hello.md",
      "--output",
      "index.html",
      "--compare",
      "sha256:build",
    ]),
    {
      name: "inspect",
      target: "provenance",
      list: false,
      json: true,
      source: "notes/hello.md",
      output: "index.html",
      compare: "sha256:build",
    },
  );
  assert.throws(() => parseCommand(["inspect", "provenance", "--source"]));
  assert.throws(() =>
    parseCommand(["inspect", "provenance", "--output", "a", "--output", "b"]),
  );
});

test("doctor rejects incompatible or unknown options", () => {
  assert.throws(() => parseCommand(["doctor", "--dry-run"]));
  assert.throws(() => parseCommand(["doctor", "--json", "--explain"]));
  assert.throws(() => parseCommand(["doctor", "--json", "--fix"]));
  assert.throws(() => parseCommand(["doctor", "--github"]));
});

test("upgrade accepts only the check-only contract", () => {
  assert.deepEqual(
    parseCommand(["upgrade", "--check", "--to", "latest", "--json"]),
    {
      name: "upgrade",
      check: true,
      to: "latest",
      json: true,
    },
  );
  assert.throws(() => parseCommand(["upgrade", "--to", "latest"]));
  assert.throws(() => parseCommand(["upgrade", "--check", "--to"]));
});
