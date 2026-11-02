import assert from "node:assert/strict";
import test from "node:test";
import { resolveInput } from "./command_fixture.js";

test("doctor accepts diagnostic output options", () => {
  assert.deepEqual(resolveInput(["doctor"]).options, {
    explain: false,
    json: false,
    fix: false,
    dryRun: false,
    failOn: undefined,
    code: [],
  });
  assert.deepEqual(
    resolveInput(["doctor", "--explain", "--fix", "--dry-run"]).options,
    {
      explain: true,
      json: false,
      fix: true,
      dryRun: true,
      failOn: undefined,
      code: [],
    },
  );
});

test("doctor accepts exit thresholds and diagnostic code filters", () => {
  assert.deepEqual(
    resolveInput(["doctor", "--fail-on", "warning", "--code", "CONTENT_X"])
      .options,
    {
      explain: false,
      json: false,
      fix: false,
      dryRun: false,
      failOn: "warning",
      code: ["CONTENT_X"],
    },
  );
});

test("inspect content accepts an exact path or permalink", () => {
  assert.deepEqual(
    resolveInput(["inspect", "content", "--path", "/notes/hello/"]).options,
    {
      list: false,
      path: "/notes/hello/",
    },
  );
  assert.throws(
    () => resolveInput(["inspect", "content", "--path"]),
    /requires a value/,
  );
});

test("inspect assets accepts list and JSON output", () => {
  assert.deepEqual(resolveInput(["inspect", "assets"]).options, {
    list: false,
    json: false,
  });
  assert.deepEqual(
    resolveInput(["inspect", "assets", "--list", "--json"]).options,
    {
      list: true,
      json: true,
    },
  );
});

test("inspect provenance accepts shared state filters and JSON", () => {
  assert.deepEqual(
    resolveInput([
      "inspect",
      "provenance",
      "--json",
      "--source",
      "notes/hello.md",
      "--output",
      "index.html",
      "--compare",
      "sha256:build",
    ]).options,
    {
      json: true,
      source: "notes/hello.md",
      output: "index.html",
      compare: "sha256:build",
    },
  );
  assert.throws(
    () => resolveInput(["inspect", "provenance", "--source"]),
    /requires a value/,
  );
  assert.throws(
    () =>
      resolveInput(["inspect", "provenance", "--output", "a", "--output", "b"]),
    /Duplicate option/,
  );
});

test("inspect api accepts deprecated filtering and JSON output", () => {
  assert.deepEqual(resolveInput(["inspect", "api"]).options, {
    deprecated: false,
    json: false,
  });
  assert.deepEqual(
    resolveInput(["inspect", "api", "--deprecated", "--json"]).options,
    {
      deprecated: true,
      json: true,
    },
  );
});

test("doctor rejects incompatible or unknown options", () => {
  assert.throws(() => resolveInput(["doctor", "--dry-run"]), /--dry-run/);
  assert.throws(
    () => resolveInput(["doctor", "--json", "--explain"]),
    /--json/,
  );
  assert.throws(() => resolveInput(["doctor", "--json", "--fix"]), /--json/);
  assert.throws(() => resolveInput(["doctor", "--github"]), /Unknown option/);
});

test("upgrade accepts only the check-only contract", () => {
  assert.deepEqual(
    resolveInput(["upgrade", "--check", "--to", "latest", "--json"]).options,
    {
      check: true,
      to: "latest",
      json: true,
    },
  );
  assert.throws(
    () => resolveInput(["upgrade", "--to", "latest"]),
    /Missing required option: --check/,
  );
  assert.throws(
    () => resolveInput(["upgrade", "--check", "--to"]),
    /requires a value/,
  );
});
