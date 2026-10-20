import assert from "node:assert/strict";
import test from "node:test";
import { renderDoctorReport } from "../src/commands/doctor_renderer.js";

test("doctor renderer marks unavailable observations as skipped", () => {
  const output = renderDoctorReport({
    version: 1,
    revision: 0,
    diagnostics: [
      {
        code: "CONTENT_UNAVAILABLE",
        category: "content",
        severity: "info",
        message: "Content inspection is unavailable.",
        subject: { kind: "content" },
      },
    ],
    summary: { errors: 0, warnings: 0, info: 1 },
  });

  assert.match(output, /SKIPPED content \(1\)/);
});

test("doctor renderer describes a non-mutating fix request", () => {
  const output = renderDoctorReport(
    {
      version: 1,
      revision: 0,
      diagnostics: [],
      summary: { errors: 0, warnings: 0, info: 0 },
    },
    { fix: true, dryRun: true },
  );

  assert.match(output, /Dry run: no safe automatic fixes are available\./);
});
