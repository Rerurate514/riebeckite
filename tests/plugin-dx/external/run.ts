#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertIsolatedInstall,
  assertNoMonorepoEscapeHatches,
  assertPackedInstall,
  createLogger,
  type PackedPackages,
  packPackages,
  run,
  runTypecheck,
  stageIsolatedSite,
  writeFileDependencies,
} from "@riebeckite/test/e2e";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const fixtureSite = path.join(here, "fixture", "site");
const fixtureVault = path.join(here, "..", "vault");
const logger = createLogger("plugin-dx-external");

const PACKAGES = [
  { directory: "packages/core", name: "@riebeckite/core" },
  { directory: "packages/node", name: "@riebeckite/node" },
  {
    directory: "tests/plugin-dx/plugins/markdown-highlight",
    name: "@plugin-dx/markdown-highlight",
  },
  {
    directory: "tests/plugin-dx/plugins/related-posts",
    name: "@plugin-dx/related-posts",
  },
  { directory: "tests/plugin-dx/plugins/demo", name: "@plugin-dx/demo" },
];

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-dx-external-"));
const tarballDir = path.join(tempRoot, "tarballs");
const siteDir = path.join(tempRoot, "site");
const vaultDir = path.join(tempRoot, "vault");
const mismatchDir = path.join(tempRoot, "mismatch");

function cleanup() {
  if (process.env.PLUGIN_DX_KEEP) return;
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function assertSharedCore() {
  const coreManifest = path.join(
    siteDir,
    "node_modules",
    "@riebeckite",
    "core",
    "package.json",
  );
  const expected = fs.realpathSync(coreManifest);
  for (const name of ["@riebeckite/node", "@plugin-dx/markdown-highlight"]) {
    const packageDir = path.join(siteDir, "node_modules", ...name.split("/"));
    const manifest = JSON.parse(
      fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
    );
    assert.equal(manifest.peerDependencies?.["@riebeckite/core"], "^0.0.51");
    assert.equal(
      fs.realpathSync(
        createRequire(path.join(packageDir, "package.json")).resolve(
          "@riebeckite/core/package.json",
        ),
      ),
      expected,
    );
  }
}

function assertPeerMismatchIsRejected(packed: PackedPackages) {
  const fakeCoreDir = path.join(mismatchDir, "core");
  fs.mkdirSync(fakeCoreDir, { recursive: true });
  fs.writeFileSync(
    path.join(fakeCoreDir, "package.json"),
    JSON.stringify({ name: "@riebeckite/core", version: "0.0.0" }),
  );
  const demo = packed.get("@plugin-dx/demo");
  if (!demo) throw new Error("The demo plugin tarball is missing");
  fs.writeFileSync(
    path.join(mismatchDir, "package.json"),
    JSON.stringify(
      {
        name: "plugin-dx-peer-mismatch",
        private: true,
        dependencies: {
          "@riebeckite/core": "file:./core",
          "@plugin-dx/demo": `file:${path.relative(mismatchDir, demo.tarball)}`,
        },
      },
      null,
      2,
    ),
  );
  const result = run(
    "npm",
    [
      "install",
      "--strict-peer-deps",
      "--no-audit",
      "--no-fund",
      "--loglevel=error",
    ],
    { cwd: mismatchDir, allowFailure: true },
  );
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
}

try {
  fs.mkdirSync(tarballDir, { recursive: true });

  const packed = await packPackages(tarballDir, {
    repoRoot,
    packages: PACKAGES,
    logger,
  });

  stageIsolatedSite({ fixtureSite, fixtureVault, siteDir, vaultDir });
  writeFileDependencies(siteDir, packed);

  logger.step("npm install (isolated, from packed tarballs)");
  run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
    cwd: siteDir,
  });

  assertIsolatedInstall(siteDir, tempRoot, { repoRoot, logger });
  assertNoMonorepoEscapeHatches(siteDir, { logger });
  assertPackedInstall(siteDir, { packed, scope: "@riebeckite", logger });
  assertPackedInstall(siteDir, { packed, scope: "@plugin-dx", logger });
  assertSharedCore();
  assertPeerMismatchIsRejected(packed);

  logger.step("verifying the packed plugins from a Riebeckite config");
  run(process.execPath, ["verify.mjs"], { cwd: siteDir });

  runTypecheck(siteDir, "tsconfig.json", logger);

  console.log("\nplugin-dx external consumer passed");
} finally {
  cleanup();
}
