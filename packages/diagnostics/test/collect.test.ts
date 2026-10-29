import assert from "node:assert/strict";
import test from "node:test";
import {
  collectDevelopmentDiagnostics,
  createDiagnosticFromError,
  sortDevelopmentDiagnostics,
} from "../index.js";

test("development diagnostics have stable fingerprints, order, and deduplication", () => {
  const first = createDiagnosticFromError(
    "content",
    "CONTENT_Z",
    "z",
    new Error("failure"),
  );
  const second = createDiagnosticFromError(
    "configuration",
    "CONFIG_A",
    "a",
    new Error("failure"),
  );

  assert.deepEqual(sortDevelopmentDiagnostics([first, second, first]), [
    second,
    first,
  ]);
  assert.match(first.fingerprint ?? "", /^rb-[a-f0-9]{8}$/);
});

test("content and output failures are reported independently", async () => {
  const report = await collectDevelopmentDiagnostics({
    config: {
      content: { directory: "content", exclude: [] },
      plugins: [],
      theme: { styles: [] },
    } as never,
    content: {
      inspect: async () => {
        throw new Error("content failure");
      },
      getOutputChangeSet: async () => {
        throw new Error("output failure");
      },
    } as never,
  });

  assert.deepEqual(
    report.diagnostics.map((diagnostic) => diagnostic.code),
    ["CONTENT_INSPECTION_FAILED", "OUTPUT_INSPECTION_FAILED"],
  );
});

test("output diagnostics are optional so callers can report content first", async () => {
  const report = await collectDevelopmentDiagnostics({
    config: {
      content: { directory: "content", exclude: [] },
      plugins: [],
      theme: { styles: [] },
    } as never,
    includeOutput: false,
    content: {
      inspect: async () => ({ diagnostics: [] }),
      getOutputChangeSet: async () => {
        throw new Error("output must not be inspected");
      },
    } as never,
  });

  assert.deepEqual(report.diagnostics, []);
});

test("error diagnostics include a stable fingerprint but not exception details", () => {
  const diagnostic = createDiagnosticFromError(
    "plugins",
    "PLUGIN_RESOLUTION",
    "Plugin resolution failed.",
    new Error("missing provider"),
  );

  const serialized = JSON.stringify(diagnostic);
  assert.match(serialized, /"fingerprint":"rb-[a-f0-9]{8}"/);
  assert.doesNotMatch(serialized, /missing provider/);
});
