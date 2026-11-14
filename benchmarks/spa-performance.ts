import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createLogger,
  packPackages,
  stageIsolatedSite,
  writeFileDependencies,
} from "@riebeckite/test/e2e";
import puppeteer from "puppeteer";

import { PACKAGES } from "../tests/external-site/fixture-spec.js";
import { measureBrowser } from "./spa_perf_server.js";
import type { Result } from "./spa_perf_types.js";
import {
  bundles,
  coldBuild,
  configure,
  run,
  summary,
} from "./spa_perf_util.js";

const samples = 5;
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const fixtureRoot = path.join(repoRoot, "tests", "external-site", "fixture");

async function main(): Promise<void> {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-spa-benchmark-"),
  );
  const logger = createLogger("spa-benchmark");
  try {
    const tarballDir = path.join(tempRoot, "tarballs");
    fs.mkdirSync(tarballDir);
    const packed = await packPackages(tarballDir, {
      repoRoot,
      packages: PACKAGES,
      logger,
    });
    const modes = {} as Result["modes"];
    for (const mode of ["off", "on", "hover"] as const) {
      const root = path.join(tempRoot, mode);
      const siteDir = path.join(root, "site");
      stageIsolatedSite({
        fixtureSite: path.join(fixtureRoot, "site"),
        fixtureVault: path.join(fixtureRoot, "vault"),
        siteDir,
        vaultDir: path.join(root, "vault"),
      });
      writeFileDependencies(siteDir, packed);
      run(
        "npm",
        ["install", "--no-audit", "--no-fund", "--loglevel=error"],
        siteDir,
      );
      configure(siteDir, mode);
      const buildMs = Array.from({ length: samples }, () => coldBuild(siteDir));
      const browser = await measureBrowser(path.join(siteDir, "dist"), mode);
      const trials = browser.samples;
      modes[mode] = {
        buildMs,
        initial: summary(trials.map((trial) => trial.initialMs)),
        navigation: summary(trials.map((trial) => trial.navigationMs)),
        prefetch: {
          beforeClick: {
            requests: trials.reduce(
              (total, trial) => total + trial.prefetch.beforeClick.requests,
              0,
            ),
            bytes: trials.reduce(
              (total, trial) => total + trial.prefetch.beforeClick.bytes,
              0,
            ),
          },
          afterClick: {
            requests: trials.reduce(
              (total, trial) => total + trial.prefetch.afterClick.requests,
              0,
            ),
            bytes: trials.reduce(
              (total, trial) => total + trial.prefetch.afterClick.bytes,
              0,
            ),
          },
        },
        memoryBytes: browser.memoryBytes,
        bundles: bundles(path.join(siteDir, "dist")),
      };
    }
    const browser = await puppeteer.launch({ headless: "shell" });
    const browserVersion = await browser.version();
    await browser.close();
    const result: Result = {
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpu: os.cpus()[0]?.model ?? "unknown",
        memoryBytes: os.totalmem(),
        browser: browserVersion,
      },
      fixture: "tests/external-site/fixture (packed public tarballs)",
      samples,
      modes,
    };
    const output = path.join(
      repoRoot,
      "benchmarks",
      "results",
      `${new Date().toISOString().replaceAll(":", "-")}-spa.json`,
    );
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
    console.log(output);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
