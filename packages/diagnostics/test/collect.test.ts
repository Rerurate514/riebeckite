import assert from "node:assert/strict";
import test from "node:test";
import {
  collectDevelopmentDiagnostics,
  createDiagnosticFromError,
  sortDevelopmentDiagnostics,
} from "../index.js";

test("development diagnostics have stable order and remove exact duplicates", () => {
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

test("plugin category is serialized with the plugin subject", () => {
  const diagnostic = createDiagnosticFromError(
    "plugins",
    "PLUGIN_RESOLUTION",
    "Plugin resolution failed.",
    new Error("missing provider"),
  );

  assert.deepEqual(JSON.parse(JSON.stringify(diagnostic)), {
    category: "plugins",
    cause: "missing provider",
    code: "PLUGIN_RESOLUTION",
    message: "Plugin resolution failed.",
    severity: "error",
    subject: { kind: "plugin" },
  });
});
