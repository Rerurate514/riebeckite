import assert from "node:assert/strict";
import test from "node:test";
import { selectChecks } from "./select_checks.mjs";

const enabled = (files) =>
  Object.entries(selectChecks(files))
    .filter(([, value]) => value)
    .map(([name]) => name)
    .sort();

test("documentation changes do not select Tier 2", () => {
  assert.deepEqual(enabled(["docs/docs/guides/overview.md"]), []);
});

test("plugin changes select their integration contract", () => {
  assert.deepEqual(enabled(["packages/plugins/search/index.ts"]), [
    "external",
    "fastPath",
    "pluginDx",
    "presetFastPath",
  ]);
});

test("core changes select cache and publication contracts", () => {
  assert.deepEqual(enabled(["packages/core/index.ts"]), [
    "browser",
    "external",
    "fastPath",
    "faultRecovery",
    "fingerprint",
    "presetFastPath",
  ]);
});

test("HonoX changes select integration contracts", () => {
  assert.deepEqual(enabled(["packages/integrations/honox/index.ts"]), [
    "browser",
    "external",
    "fastPath",
    "faultRecovery",
    "fingerprint",
    "presetFastPath",
  ]);
});

test("CLI changes select publication and recovery contracts", () => {
  assert.deepEqual(enabled(["packages/cli/bin/riebeckite.mjs"]), [
    "browser",
    "external",
    "fastPath",
    "faultRecovery",
    "fingerprint",
    "presetFastPath",
  ]);
});

test("scaffold changes select scaffold and generated-site contracts", () => {
  assert.deepEqual(enabled(["packages/create-riebeckite/src/index.ts"]), [
    "external",
    "fastPath",
    "presetFastPath",
    "scaffold",
  ]);
});

test("cache-related core changes select the full recovery contract", () => {
  assert.equal(
    selectChecks(["packages/core/src/cache.ts"]).faultRecovery,
    true,
  );
});

test("lockfile changes fall back to the full suite", () => {
  assert.deepEqual(
    enabled(["pnpm-lock.yaml"]),
    Object.keys(selectChecks([])).sort(),
  );
});

test("workflow changes fall back to the full suite", () => {
  assert.deepEqual(
    enabled([".github/workflows/ci.yml"]),
    Object.keys(selectChecks([])).sort(),
  );
});

test("unknown changes fall back to the full suite", () => {
  assert.deepEqual(
    enabled(["unknown/input.txt"]),
    Object.keys(selectChecks([])).sort(),
  );
});
