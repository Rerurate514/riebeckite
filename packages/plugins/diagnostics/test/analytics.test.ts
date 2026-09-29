import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { definePlugin, resolveConfig } from "@riebeckite/core";
import { hasEnabledAnalyticsPlugin, runDiagnostics } from "../index.js";

test("analytics coverage reports only published notes without a stable ID", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-diag-"));
  try {
    fs.mkdirSync(path.join(root, "with-id"), { recursive: true });
    fs.mkdirSync(path.join(root, "without-id"), { recursive: true });
    fs.mkdirSync(path.join(root, "private"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "with-id", "index.md"),
      "---\ntitle: With ID\nid: stable-1\npublish: true\n---\n# With ID\n",
    );
    fs.writeFileSync(
      path.join(root, "without-id", "index.md"),
      "---\ntitle: Without ID\npublish: true\n---\n# Without ID\n",
    );
    fs.writeFileSync(
      path.join(root, "private", "index.md"),
      "---\ntitle: Private\nid: stable-2\n---\n# Private\n",
    );

    const report = await runDiagnostics(root, {
      reportAnalyticsCoverage: true,
      publishStrategy: "explicit",
    });
    const coverage = report.diagnostics.filter(
      (diagnostic) => diagnostic.code === "analytics-untracked",
    );
    assert.equal(coverage.length, 1);
    assert.equal(coverage[0]?.slug, "without-id/index");
    assert.equal(coverage[0]?.filePath, "without-id/index.md");
    assert.equal(coverage[0]?.severity, "info");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("analytics coverage stays silent without the option", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-diag-"));
  try {
    fs.writeFileSync(
      path.join(root, "index.md"),
      "---\ntitle: No ID\npublish: true\n---\n",
    );
    const report = await runDiagnostics(root, { publishStrategy: "explicit" });
    assert.equal(
      report.diagnostics.some(
        (diagnostic) => diagnostic.code === "analytics-untracked",
      ),
      false,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("hasEnabledAnalyticsPlugin detects the analytics plugin in a resolved config", () => {
  const enabled = resolveConfig({
    site: { title: "Test" },
    plugins: [definePlugin({ name: "analytics" })],
  });
  const disabled = resolveConfig({
    site: { title: "Test" },
    plugins: [definePlugin({ name: "analytics", enabled: false })],
  });
  const unrelated = resolveConfig({
    site: { title: "Test" },
    plugins: [definePlugin({ name: "search" })],
  });
  assert.equal(hasEnabledAnalyticsPlugin(enabled), true);
  assert.equal(hasEnabledAnalyticsPlugin(disabled), false);
  assert.equal(hasEnabledAnalyticsPlugin(unrelated), false);
  assert.equal(hasEnabledAnalyticsPlugin(undefined), false);
});
