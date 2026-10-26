import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BuildArtifactError,
  createMetadata,
  parseMetadata,
  readMetadata,
  SCHEMA_VERSION,
  verify,
} from "./build_artifact.mjs";

function createFixture(t) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-build-artifact-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(root, "pnpm-lock.yaml"),
    "lockfileVersion: '9.0'\n",
  );
  fs.mkdirSync(path.join(root, "packages/core/dist"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "packages/core/package.json"),
    `${JSON.stringify({ name: "@riebeckite/core", version: "0.0.27" }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(root, "packages/core/dist/index.js"),
    "export {};\n",
  );
  fs.writeFileSync(
    path.join(root, "packages/core/dist/a.js"),
    "export const a = 1;\n",
  );
  return { root, packageDirectories: ["packages/core"] };
}

function create(fixture) {
  return createMetadata({
    rootDirectory: fixture.root,
    packageDirectories: fixture.packageDirectories,
    commit: "a".repeat(40),
  });
}

test("creates and verifies metadata for the same environment", (t) => {
  const fixture = createFixture(t);
  const metadata = create(fixture);
  assert.equal(metadata.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(Object.keys(metadata.distFiles), [
    "packages/core/dist/a.js",
    "packages/core/dist/index.js",
  ]);
  verify(metadata, create(fixture));
});

test("reports the node mismatch with artifact and runner versions", (t) => {
  const fixture = createFixture(t);
  const artifact = create(fixture);
  artifact.node = "v0.0.0";
  assert.throws(
    () => verify(artifact, create(fixture)),
    (error) => {
      assert.ok(error instanceof BuildArtifactError);
      assert.match(error.message, /Build artifact environment mismatch/);
      assert.match(error.message, /Key:\s+node/);
      assert.match(error.message, /Artifact: v0\.0\.0/);
      assert.ok(error.message.includes(`Runner:   ${process.version}`));
      assert.match(error.message, /Artifact verification failed\./);
      return true;
    },
  );
});

test("reports a platform mismatch", (t) => {
  const fixture = createFixture(t);
  const artifact = create(fixture);
  artifact.platform = "mismatched";
  assert.throws(
    () => verify(artifact, create(fixture)),
    (error) => {
      assert.match(error.message, /Key:\s+platform/);
      assert.match(error.message, /Artifact: mismatched/);
      return true;
    },
  );
});

test("rejects an artifact from another commit", (t) => {
  const fixture = createFixture(t);
  const artifact = { ...create(fixture), commit: "b".repeat(40) };
  assert.throws(
    () => verify(artifact, create(fixture)),
    /Build artifact environment mismatch:\n\s+Key:\s+commit/,
  );
});

test("reports package version mismatches", (t) => {
  const fixture = createFixture(t);
  const artifact = create(fixture);
  artifact.packageVersions["@riebeckite/core"] = "0.0.26";
  assert.throws(
    () => verify(artifact, create(fixture)),
    /@riebeckite\/core: artifact=0\.0\.26 runner=0\.0\.27/,
  );
});

test("reports changed and missing dist files", (t) => {
  const fixture = createFixture(t);
  const artifact = create(fixture);
  artifact.distFiles["packages/core/dist/index.js"] = "0".repeat(64);
  delete artifact.distFiles["packages/core/dist/a.js"];
  assert.throws(
    () => verify(artifact, create(fixture)),
    (error) => {
      assert.match(error.message, /Missing: packages\/core\/dist\/a\.js/);
      assert.match(error.message, /Changed: packages\/core\/dist\/index\.js/);
      return true;
    },
  );
});

test("rejects an artifact without dist files", (t) => {
  const fixture = createFixture(t);
  const artifact = { ...create(fixture), distFiles: {} };
  assert.throws(
    () => verify(artifact, create(fixture)),
    /Build artifact metadata contains no dist files/,
  );
});

test("fails closed when metadata is missing", (t) => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-build-artifact-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(
    () => readMetadata(path.join(root, "metadata.json")),
    /Build artifact metadata is missing/,
  );
});

test("fails closed when metadata is corrupt", (t) => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-build-artifact-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, "metadata.json");
  fs.writeFileSync(file, "{\n");
  assert.throws(
    () => readMetadata(file),
    /Build artifact metadata is not valid JSON/,
  );
});

test("rejects metadata with missing required fields", () => {
  assert.throws(
    () =>
      parseMetadata(`${JSON.stringify({ schemaVersion: SCHEMA_VERSION })}\n`),
    /missing required field\(s\): commit, lockfile, node, platform, arch/,
  );
});

test("rejects unsupported metadata schema versions", (t) => {
  const fixture = createFixture(t);
  const artifact = { ...create(fixture), schemaVersion: SCHEMA_VERSION + 1 };
  assert.throws(
    () => verify(artifact, create(fixture)),
    /Build artifact format mismatch:\n\s+Key:\s+schemaVersion/,
  );
});
