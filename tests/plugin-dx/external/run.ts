#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertIsolatedInstall,
  assertNoMonorepoEscapeHatches,
  createLogger,
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

function cleanup() {
  if (process.env.PLUGIN_DX_KEEP) return;
  fs.rmSync(tempRoot, { recursive: true, force: true });
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

  logger.step("verifying the packed plugins from a Riebeckite config");
  run(process.execPath, ["verify.mjs"], { cwd: siteDir });

  runTypecheck(siteDir, "tsconfig.json", logger);

  console.log("\nplugin-dx external consumer passed");
} finally {
  cleanup();
}
