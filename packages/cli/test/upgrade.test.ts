import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectUpgradeReport } from "../src/commands/upgrade.js";

test("upgrade blocks a project without one supported lockfile", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-upgrade-"));
  try {
    const packageJson = '{"dependencies":{"@riebeckite/core":"^0.0.32"}}\n';
    await fs.writeFile(path.join(root, "package.json"), packageJson);

    const report = await collectUpgradeReport(
      { projectRoot: root, contentRoot: root } as never,
      "latest",
    );

    assert.equal(report.verdict, "BLOCKED");
    assert.equal(report.packageManager, undefined);
    assert.deepEqual(report.packages, ["@riebeckite/core"]);
    assert.equal(
      await fs.readFile(path.join(root, "package.json"), "utf8"),
      packageJson,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("upgrade leaves external content sources unverified", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-upgrade-"));
  const content = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-content-"),
  );
  try {
    await fs.writeFile(
      path.join(root, "package.json"),
      '{"dependencies":{"@riebeckite/core":"^0.0.32"}}\n',
    );
    await fs.writeFile(
      path.join(root, "pnpm-lock.yaml"),
      "lockfileVersion: '9.0'\n",
    );

    const report = await collectUpgradeReport(
      { projectRoot: root, contentRoot: content } as never,
      "latest",
    );

    assert.equal(report.verdict, "UNVERIFIED");
    assert.match(report.notes[0] ?? "", /outside the project/);
  } finally {
    await Promise.all([
      fs.rm(root, { recursive: true, force: true }),
      fs.rm(content, { recursive: true, force: true }),
    ]);
  }
});
