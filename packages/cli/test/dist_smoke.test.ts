import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const createRiebeckiteRoot = path.resolve(
  packageRoot,
  "..",
  "create-riebeckite",
);
const cliBundle = path.join(packageRoot, "dist", "cli.js");
const cliBin = path.join(packageRoot, "bin", "riebeckite.mjs");

function build(packagePath: string): void {
  const result = spawnSync("pnpm run build", {
    cwd: packagePath,
    encoding: "utf8",
    shell: true,
  });
  assert.equal(
    result.status,
    0,
    `Building ${packagePath} failed:\n${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
}

before(() => {
  build(createRiebeckiteRoot);
  build(packageRoot);
});

function runCli(entry: string, ...args: readonly string[]) {
  return spawnSync(process.execPath, [entry, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
  });
}

function assertNoUnresolvedImports(output: string): void {
  assert.doesNotMatch(output, /Cannot find module/);
  assert.doesNotMatch(output, /Dynamic require of/);
  assert.doesNotMatch(output, /MODULE_NOT_FOUND/);
}

test("the built CLI bundle starts without unresolved dynamic imports", () => {
  const result = runCli(cliBundle, "init", "--list-presets");
  const output = `${result.stdout}${result.stderr}`;

  assertNoUnresolvedImports(output);
  assert.match(output, /Available presets:/);
});

test("the published bin wrapper starts the built CLI bundle", () => {
  const result = runCli(cliBin, "--help");
  const output = `${result.stdout}${result.stderr}`;

  assertNoUnresolvedImports(output);
  assert.match(output, /Usage: riebeckite/);
});

test("the built CLI scaffolds a project through the external create-riebeckite package", () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-cli-init-"),
  );
  try {
    const siteDir = path.join(temporary, "site");
    const result = spawnSync(
      process.execPath,
      [cliBundle, "init", siteDir, "--preset", "minimal"],
      { cwd: temporary, encoding: "utf8" },
    );
    const output = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 0, output);
    assertNoUnresolvedImports(output);

    for (const relative of [
      "package.json",
      "riebeckite.config.ts",
      "app/server.ts",
      "content/index.md",
    ]) {
      assert.ok(
        fs.existsSync(path.join(siteDir, relative)),
        `${relative} must be generated`,
      );
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("the built CLI scaffolds a deployment-enabled project", () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-cli-deploy-"),
  );
  try {
    const siteDir = path.join(temporary, "site");
    const result = spawnSync(
      process.execPath,
      [cliBundle, "init", siteDir, "--preset", "minimal", "--github-actions"],
      { cwd: temporary, encoding: "utf8" },
    );
    const output = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 0, output);
    assertNoUnresolvedImports(output);
    assert.ok(
      fs.existsSync(path.join(siteDir, "wrangler.jsonc")),
      "wrangler.jsonc must be generated",
    );
    assert.ok(
      fs.existsSync(path.join(siteDir, ".github", "workflows", "deploy.yml")),
      "the deployment workflow must be generated",
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("the built CLI bundle externalizes the scaffold instead of inlining templates", () => {
  const bundle = fs.readFileSync(cliBundle, "utf8");
  assert.match(bundle, /create-riebeckite\/scaffold/);
  assert.doesNotMatch(bundle, /Riebeckite scaffold templates were not found/);
  assert.doesNotMatch(bundle, /templates\/scaffold/);
  assert.ok(!fs.existsSync(path.join(packageRoot, "dist", "templates")));
  assert.ok(!fs.existsSync(path.join(packageRoot, "templates")));
  assert.ok(!fs.existsSync(path.join(packageRoot, "assets")));
});
