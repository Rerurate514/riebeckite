import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  formatPluginContractReport,
  verifyPluginContract,
} from "../src/commands/plugin_contract.js";

function packageDirectory(manifest) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-contract-"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(manifest, null, 2),
  );
  return root;
}

test("reports missing package metadata as a contract failure", () => {
  const root = packageDirectory({});
  try {
    const report = verifyPluginContract(root);
    assert.equal(report.passed, false);
    assert.equal(
      report.results.find((result) => result.contract === "package.name")
        ?.status,
      "FAIL",
    );
    assert.match(formatPluginContractReport(report), /Verification failed/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("accepts a package with declared, existing export targets", () => {
  const root = packageDirectory({
    name: "@example/plugin",
    version: "1.0.0",
    type: "module",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
      },
    },
  });
  try {
    fs.mkdirSync(path.join(root, "dist"));
    fs.writeFileSync(path.join(root, "dist", "index.js"), "export {};\n");
    fs.writeFileSync(path.join(root, "dist", "index.d.ts"), "export {};\n");
    const report = verifyPluginContract(root);
    assert.equal(
      report.results.find((result) => result.contract === "package.exports")
        ?.status,
      "PASS",
    );
    assert.equal(
      report.results.filter((result) => result.status === "FAIL").length,
      0,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
