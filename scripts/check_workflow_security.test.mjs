import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findUnpinnedActionReferences } from "./check_workflow_security.mjs";

test("findUnpinnedActionReferences rejects mutable third-party action tags", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-workflow-"));
  try {
    fs.writeFileSync(
      path.join(root, "ci.yml"),
      "steps:\n  - uses: actions/cache@v4\n  - uses: ./local-action\n",
    );
    assert.deepEqual(findUnpinnedActionReferences(root), [
      "ci.yml: actions/cache@v4",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("findUnpinnedActionReferences accepts full commit SHAs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-workflow-"));
  try {
    fs.writeFileSync(
      path.join(root, "ci.yaml"),
      "steps:\n  - uses: actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830\n",
    );
    assert.deepEqual(findUnpinnedActionReferences(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
