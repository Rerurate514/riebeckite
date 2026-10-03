import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const cliBundle = path.join(packageRoot, "dist", "cli.js");
const cliBin = path.join(packageRoot, "bin", "riebeckite.mjs");

before(() => {
  const build = spawnSync("pnpm run build", {
    cwd: packageRoot,
    encoding: "utf8",
    shell: true,
  });
  assert.equal(
    build.status,
    0,
    `Building the CLI failed:\n${build.stdout ?? ""}${build.stderr ?? ""}`,
  );
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
