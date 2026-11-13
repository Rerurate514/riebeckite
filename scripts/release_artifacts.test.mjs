import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ARTIFACT_LEDGER_PATH,
  checkArtifactCoverage,
  computeArtifactHashes,
  findUncoveredChanges,
  hashPackageArtifacts,
  readArtifactLedger,
  writeArtifactLedger,
} from "./release_artifacts.mjs";

function createRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-artifacts-"));
}

function writePackage(
  root,
  directory,
  {
    name = "@riebeckite/example",
    version = "1.0.0",
    files = ["README.md", "dist"],
    exports = { ".": "./dist/index.js" },
    contents = { "dist/index.js": "export const value = 1;\n" },
  } = {},
) {
  const packageRoot = path.join(root, directory);

  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, "package.json"),
    `${JSON.stringify({ name, version, files, exports }, null, 2)}\n`,
  );

  for (const [relative, content] of Object.entries(contents)) {
    const absolute = path.join(packageRoot, relative);

    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }

  return packageRoot;
}

test("a version-only manifest change does not change the artifact hash", () => {
  const root = createRoot();
  const directory = "packages/example";

  writePackage(root, directory);
  const before = hashPackageArtifacts(root, directory).hash;

  writePackage(root, directory, { version: "1.0.1" });

  assert.equal(hashPackageArtifacts(root, directory).hash, before);
});

test("a root README change does not change the artifact hash", () => {
  const root = createRoot();
  const directory = "packages/example";

  writePackage(root, directory);
  const before = hashPackageArtifacts(root, directory).hash;

  fs.writeFileSync(path.join(root, directory, "README.md"), "updated docs\n");

  assert.equal(hashPackageArtifacts(root, directory).hash, before);
});

test("a published file change changes the artifact hash", () => {
  const root = createRoot();
  const directory = "packages/example";

  writePackage(root, directory);
  const before = hashPackageArtifacts(root, directory).hash;

  fs.writeFileSync(
    path.join(root, directory, "dist/index.js"),
    "export const value = 2;\n",
  );

  assert.notEqual(hashPackageArtifacts(root, directory).hash, before);
});

test("a missing dist fails instead of hashing an unbuilt package", () => {
  const root = createRoot();

  writePackage(root, "packages/example", { contents: {} });

  assert.throws(
    () => hashPackageArtifacts(root, "packages/example"),
    /dist is missing/,
  );
});

test("a changed package with no change entry is uncovered", () => {
  const root = createRoot();
  const directories = ["packages/example"];

  writePackage(root, "packages/example", { name: "@riebeckite/example" });
  writeArtifactLedger(root, computeArtifactHashes(root, directories));

  fs.writeFileSync(
    path.join(root, "packages/example/dist/index.js"),
    "export const value = 2;\n",
  );

  const coverage = checkArtifactCoverage({
    root,
    directories,
    entryPackages: [],
  });

  assert.equal(coverage.baseline, false);
  assert.deepEqual(
    coverage.uncovered.map(({ name }) => name),
    ["@riebeckite/example"],
  );
});

test("a changed package listed in a change entry is covered", () => {
  const root = createRoot();
  const directories = ["packages/example"];

  writePackage(root, "packages/example", { name: "@riebeckite/example" });
  writeArtifactLedger(root, computeArtifactHashes(root, directories));

  fs.writeFileSync(
    path.join(root, "packages/example/dist/index.js"),
    "export const value = 2;\n",
  );

  const coverage = checkArtifactCoverage({
    root,
    directories,
    entryPackages: ["@riebeckite/example"],
  });

  assert.deepEqual(coverage.uncovered, []);
});

test("create-riebeckite is exempt because it embeds the release version", () => {
  const uncovered = findUncoveredChanges(
    [
      { directory: "packages/create-riebeckite", name: "create-riebeckite" },
      { directory: "packages/core", name: "@riebeckite/core" },
    ],
    [],
  );

  assert.deepEqual(
    uncovered.map(({ name }) => name),
    ["@riebeckite/core"],
  );
});

test("a missing ledger reports that a baseline is required", () => {
  const root = createRoot();
  const directories = ["packages/example"];

  writePackage(root, "packages/example");

  const coverage = checkArtifactCoverage({ root, directories });

  assert.equal(coverage.baseline, true);
  assert.equal(readArtifactLedger(root), null);
});

test("the ledger round-trips sorted package hashes", () => {
  const root = createRoot();
  const hashes = new Map([
    ["packages/b", { name: "@riebeckite/b", hash: "bb" }],
    ["packages/a", { name: "@riebeckite/a", hash: "aa" }],
  ]);

  writeArtifactLedger(root, hashes);

  const ledger = JSON.parse(
    fs.readFileSync(path.join(root, ARTIFACT_LEDGER_PATH), "utf8"),
  );

  assert.deepEqual(Object.keys(ledger.packages), [
    "@riebeckite/a",
    "@riebeckite/b",
  ]);
  assert.deepEqual(readArtifactLedger(root), ledger.packages);
});
