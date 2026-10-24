import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyPluginContract } from "../plugin-contract.js";

function fixture(manifest: object, files: Record<string, string>): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-contract-test-"),
  );
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(manifest));
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

test("verifies public package, client, CSS, and declarations", () => {
  const root = fixture(
    {
      name: "plugin-example",
      exports: {
        ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
        "./client": { import: "./dist/client.js", types: "./dist/client.d.ts" },
        "./style.css": "./style.css",
      },
    },
    {
      "dist/index.js": "export {}",
      "dist/index.d.ts": "export {}",
      "dist/client.js": "export {}",
      "dist/client.d.ts": "export {}",
      "style.css": "",
    },
  );
  try {
    const report = verifyPluginContract(root);
    assert.equal(report.passed, true);
    assert.deepEqual(report.capabilities, ["package", "client"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports missing declared client exports as failures", () => {
  const root = fixture(
    { name: "plugin-example", exports: { ".": "./dist/index.js" } },
    { "dist/index.js": "export {}" },
  );
  try {
    const report = verifyPluginContract(root, {
      capabilities: ["package", "client"],
    });
    assert.equal(report.passed, false);
    assert.equal(
      report.results.find((result) => result.contract === "client.entry")
        ?.status,
      "FAIL",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("verifies the packed distribution at full level", () => {
  const root = fixture(
    {
      name: "plugin-example",
      version: "1.0.0",
      files: ["dist"],
      exports: {
        ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
      },
    },
    { "dist/index.js": "export {}", "dist/index.d.ts": "export {}" },
  );
  try {
    const report = verifyPluginContract(root, { level: "full" });
    assert.equal(
      report.results.find((result) => result.contract === "package.tarball")
        ?.status,
      "PASS",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
