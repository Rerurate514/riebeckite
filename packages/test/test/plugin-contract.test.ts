import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  formatPluginContractReport,
  verifyPluginContract,
} from "../plugin-contract.js";

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
    assert.equal(report.complete, true);
    assert.deepEqual(report.capabilities, ["package", "client"]);
    assert.ok(report.results.every((result) => result.executed));
    assert.match(
      formatPluginContractReport(report),
      /executed: 3; not executed: 0; failed: 0/,
    );
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

test("does not run pack lifecycle scripts or pnpmfile hooks", () => {
  const root = fixture(
    {
      name: "plugin-example",
      version: "1.0.0",
      files: ["dist"],
      scripts: {
        prepack: `node -e "require('fs').writeFileSync('prepack-ran','')"`,
      },
      exports: {
        ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
      },
    },
    {
      "dist/index.js": "export {}",
      "dist/index.d.ts": "export {}",
      ".pnpmfile.cjs": `require("fs").writeFileSync("pnpmfile-ran", "")`,
    },
  );
  try {
    const report = verifyPluginContract(root, { level: "full" });
    const tarball = report.results.find(
      (result) => result.contract === "package.tarball",
    );
    assert.equal(tarball?.status, "PASS");
    assert.match(tarball?.actual ?? "", /lifecycle scripts disabled/);
    assert.match(tarball?.actual ?? "", /pnpmfile disabled/);
    assert.equal(fs.existsSync(path.join(root, "prepack-ran")), false);
    assert.equal(fs.existsSync(path.join(root, "pnpmfile-ran")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("runs only a fixture registered for the exact package and directory", () => {
  const root = fixture(
    { name: "plugin-example", exports: { ".": "./dist/index.js" } },
    { "dist/index.js": "export {}" },
  );
  const marker = path.join(root, "fixture-ran");
  const write = `require("fs").writeFileSync(${JSON.stringify(marker)}, "")`;
  const fixtureEntry = {
    packageName: "plugin-example",
    packageDirectory: root,
    integration: {
      command: process.execPath,
      args: ["-e", write],
    },
    full: {
      command: process.execPath,
      args: ["-e", write],
      browser: true,
    },
  };
  try {
    const integration = verifyPluginContract(root, {
      level: "integration",
      fixtures: [fixtureEntry],
    });
    assert.equal(
      integration.results.find(
        (result) => result.contract === "fixture.integration",
      )?.status,
      "PASS",
    );
    assert.equal(fs.existsSync(marker), true);

    fs.rmSync(marker);
    const full = verifyPluginContract(root, {
      level: "full",
      fixtures: [fixtureEntry],
    });
    assert.equal(
      full.results.find((result) => result.contract === "fixture.browser")
        ?.status,
      "PASS",
    );

    fs.rmSync(marker);
    const mismatched = verifyPluginContract(root, {
      level: "integration",
      fixtures: [
        { ...fixtureEntry, packageDirectory: path.join(root, "other") },
      ],
    });
    assert.equal(fs.existsSync(marker), false);
    assert.equal(
      mismatched.results.find(
        (result) => result.contract === "fixture.registry",
      )?.status,
      "UNVERIFIED",
    );
    assert.equal(
      mismatched.results.find(
        (result) => result.contract === "fixture.registry",
      )?.executed,
      false,
    );
    assert.equal(mismatched.complete, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("does not report browser verification for a full command without a browser", () => {
  const root = fixture(
    { name: "plugin-example", exports: { ".": "./dist/index.js" } },
    { "dist/index.js": "export {}" },
  );
  try {
    const report = verifyPluginContract(root, {
      level: "full",
      fixtures: [
        {
          packageName: "plugin-example",
          packageDirectory: root,
          integration: { command: process.execPath, args: ["-e", "0"] },
          full: { command: process.execPath, args: ["-e", "0"] },
        },
      ],
    });
    assert.equal(
      report.results.find((result) => result.contract === "fixture.full")
        ?.status,
      "PASS",
    );
    assert.equal(
      report.results.find((result) => result.contract === "fixture.browser")
        ?.status,
      "UNVERIFIED",
    );
    assert.equal(report.complete, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports unverified browser behavior when no full fixture exists", () => {
  const root = fixture(
    { name: "plugin-example", exports: { ".": "./dist/index.js" } },
    { "dist/index.js": "export {}" },
  );
  try {
    const report = verifyPluginContract(root, {
      level: "full",
      fixtures: [
        {
          packageName: "plugin-example",
          packageDirectory: root,
          integration: { command: process.execPath, args: ["-e", "0"] },
        },
      ],
    });
    assert.equal(
      report.results.find((result) => result.contract === "fixture.browser")
        ?.status,
      "UNVERIFIED",
    );
    assert.equal(report.complete, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reports a failing trusted fixture without a browser pass", () => {
  const root = fixture(
    { name: "plugin-example", exports: { ".": "./dist/index.js" } },
    { "dist/index.js": "export {}" },
  );
  try {
    const report = verifyPluginContract(root, {
      level: "full",
      fixtures: [
        {
          packageName: "plugin-example",
          packageDirectory: root,
          integration: { command: process.execPath, args: ["-e", "0"] },
          full: {
            command: process.execPath,
            args: ["-e", "process.exit(1)"],
            browser: true,
          },
        },
      ],
    });
    assert.equal(
      report.results.find((result) => result.contract === "fixture.full")
        ?.status,
      "FAIL",
    );
    assert.equal(
      report.results.find((result) => result.contract === "fixture.browser")
        ?.status,
      "FAIL",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
