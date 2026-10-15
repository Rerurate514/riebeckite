import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createLogger,
  type PackageSpec,
  packPackages,
  writeFileDependencies,
} from "@riebeckite/test/e2e";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const logger = createLogger("fingerprint");
const keep = process.env.RIEBECKITE_FINGERPRINT_KEEP === "1";
const maxBuffer = 256 * 1024 * 1024;

async function discoverPackages(): Promise<PackageSpec[]> {
  const scanRoots = [
    "packages",
    "packages/integrations",
    "packages/plugins",
    "packages/themes",
  ];
  const specs: PackageSpec[] = [];
  for (const scanRoot of scanRoots) {
    const entries = await fs
      .readdir(path.join(repoRoot, scanRoot), { withFileTypes: true })
      .catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(
        repoRoot,
        scanRoot,
        entry.name,
        "package.json",
      );
      const manifest = await fs
        .readFile(manifestPath, "utf8")
        .then(
          (source) =>
            JSON.parse(source) as { name?: string; private?: boolean },
        )
        .catch(() => undefined);
      if (!manifest?.name || manifest.private === true) continue;
      specs.push({
        directory: `${scanRoot}/${entry.name}`,
        name: manifest.name,
      });
    }
  }
  return specs;
}

function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  useShell = false,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: "utf8",
    maxBuffer,
    shell: useShell && process.platform === "win32",
    env: { ...process.env, RIEBECKITE_BUILD_CONCURRENCY: "1" },
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

async function readPipelineFingerprint(siteDir: string): Promise<string> {
  const statePath = path.join(
    siteDir,
    ".riebeckite",
    "build",
    "content-state.json",
  );
  const raw = await fs.readFile(statePath, "utf8");
  const state = JSON.parse(raw) as { pipelineFingerprint?: string };
  return state.pipelineFingerprint ?? "";
}

async function main(): Promise<void> {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-fingerprint-"),
  );
  const tarballDir = path.join(workspaceRoot, "tarballs");
  const siteDir = path.join(workspaceRoot, "starter");
  logger.step(`workspace ${workspaceRoot}`);

  try {
    await fs.mkdir(tarballDir, { recursive: true });
    const packages = await discoverPackages();
    logger.step(`packing ${packages.length} packages`);
    const packed = await packPackages(tarballDir, {
      repoRoot,
      packages,
      logger,
    });

    const repoCli = path.join(
      repoRoot,
      "packages",
      "cli",
      "bin",
      "riebeckite.mjs",
    );
    logger.step("scaffolding starter site");
    const scaffold = runCommand(
      process.execPath,
      [repoCli, "init", siteDir],
      repoRoot,
    );
    assert.equal(
      scaffold.status,
      0,
      `scaffold failed:\n${scaffold.stdout}\n${scaffold.stderr}`,
    );

    writeFileDependencies(siteDir, packed);

    logger.step("installing site dependencies");
    const install = runCommand(
      "npm",
      ["install", "--no-audit", "--no-fund", "--loglevel=error"],
      siteDir,
      true,
    );
    assert.equal(
      install.status,
      0,
      `npm install failed:\n${install.stdout}\n${install.stderr}`,
    );

    const installedCli = path.join(
      siteDir,
      "node_modules",
      "@riebeckite",
      "cli",
      "bin",
      "riebeckite.mjs",
    );

    logger.step("cold build");
    const cold = runCommand(process.execPath, [installedCli, "build"], siteDir);
    assert.equal(
      cold.status,
      0,
      `cold build failed:\n${cold.stdout}\n${cold.stderr}`,
    );
    assert.doesNotMatch(
      `${cold.stdout}${cold.stderr}`,
      /No-change fast path/,
      "the cold build must not use the no-change fast path",
    );
    const fingerprintAfterCold = await readPipelineFingerprint(siteDir);

    logger.step("no-change build (separate process)");
    const noChange = runCommand(
      process.execPath,
      [installedCli, "build"],
      siteDir,
    );
    assert.equal(
      noChange.status,
      0,
      `no-change build failed:\n${noChange.stdout}\n${noChange.stderr}`,
    );
    const fingerprintAfterNoChange = await readPipelineFingerprint(siteDir);

    assert.equal(
      fingerprintAfterNoChange,
      fingerprintAfterCold,
      [
        "the persisted pipeline fingerprint changed between the cold build and the",
        "no-change build in a separate process:",
        `  cold=${fingerprintAfterCold}`,
        `  no-change=${fingerprintAfterNoChange}`,
      ].join("\n"),
    );
    assert.match(
      `${noChange.stdout}${noChange.stderr}`,
      /Content: \d+ total · 0 processed · \d+ reused/,
      [
        "the no-change build re-processed content instead of reusing it, which means",
        "the CLI-side pipeline fingerprint did not match the persisted one:",
        `pipelineFingerprint=${fingerprintAfterNoChange}`,
        `stdout tail:\n${noChange.stdout.slice(-2000)}`,
      ].join("\n"),
    );

    logger.step(
      `ok: fingerprint=${fingerprintAfterNoChange} content reused on no-change build`,
    );
  } finally {
    if (!keep) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    } else {
      logger.step(`kept workspace ${workspaceRoot}`);
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
