import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { repositoryPluginContractFixtures } from "../src/commands/plugin_contract_fixtures.js";

function createRepository(): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-fixture-registry-"),
  );
  fs.writeFileSync(
    path.join(root, "pnpm-workspace.yaml"),
    "packages:\n  - packages/*\n",
  );
  const runner = path.join(
    root,
    "tests",
    "plugin-contracts",
    "meta-bind",
    "run.ts",
  );
  const packageDirectory = path.join(root, "packages", "plugins", "meta-bind");
  fs.mkdirSync(path.dirname(runner), { recursive: true });
  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.writeFileSync(runner, "export {};\n");
  fs.writeFileSync(path.join(packageDirectory, "package.json"), "{}\n");
  return root;
}

test("registers the Meta Bind fixture from the enclosing repository", () => {
  const root = createRepository();
  try {
    const nested = path.join(root, "packages", "plugins", "meta-bind");
    const fixtures = repositoryPluginContractFixtures(nested);
    assert.equal(fixtures.length, 1);
    const [fixture] = fixtures;
    assert.equal(fixture.packageName, "@riebeckite/plugin-meta-bind");
    assert.equal(
      fixture.packageDirectory,
      path.join(root, "packages", "plugins", "meta-bind"),
    );
    assert.equal(fixture.integration.cwd, root);
    assert.equal(fixture.integration.browser, false);
    assert.equal(fixture.integration.args.at(-1), "--no-browser");
    assert.equal(fixture.full?.cwd, root);
    assert.equal(fixture.full?.browser, true);
    assert.equal(fixture.full?.args.includes("--no-browser"), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("does not register fixtures outside a repository or without a fixture", () => {
  const outside = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-fixture-registry-"),
  );
  const incomplete = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-fixture-registry-"),
  );
  try {
    fs.writeFileSync(
      path.join(incomplete, "pnpm-workspace.yaml"),
      "packages: []\n",
    );
    assert.deepEqual(repositoryPluginContractFixtures(outside), []);
    assert.deepEqual(repositoryPluginContractFixtures(incomplete), []);
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
    fs.rmSync(incomplete, { recursive: true, force: true });
  }
});
