import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createLogger,
  type PackageSpec,
  packPackages,
  run,
  walkFiles,
  writeFileDependencies,
} from "@riebeckite/test/e2e";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const logger = createLogger("fault-recovery");

const checkpoints = [
  "content-build-state-save-start",
  "content-build-state-committed",
  "build-state-before",
  "entry-create-start",
  "entry-body-write",
  "entry-rename-before",
  "entry-committed",
  "metadata-save-start",
  "metadata-committed",
  "sidecar-save-start",
  "sidecar-committed",
  "gc-start",
  "gc-entry-delete",
];

const smokeCheckpoints = [
  "content-build-state-committed",
  "entry-committed",
  "gc-entry-delete",
];

function selectedCheckpoints(): readonly string[] {
  const configured = process.env.RIEBECKITE_FAULT_RECOVERY_CHECKPOINTS;
  const requested = configured
    ? configured.split(",").map((checkpoint) => checkpoint.trim())
    : process.argv.includes("--smoke")
      ? smokeCheckpoints
      : checkpoints;
  if (
    requested.length === 0 ||
    requested.some((checkpoint) => !checkpoints.includes(checkpoint))
  ) {
    throw new Error(
      "RIEBECKITE_FAULT_RECOVERY_CHECKPOINTS contains an unknown checkpoint.",
    );
  }
  return requested;
}

async function discoverPackages(): Promise<PackageSpec[]> {
  const roots = [
    "packages",
    "packages/integrations",
    "packages/plugins",
    "packages/themes",
  ];
  const packages: PackageSpec[] = [];
  for (const root of roots) {
    for (const entry of await fs.readdir(path.join(repoRoot, root), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;
      const directory = path.join(root, entry.name);
      const manifest = await fs
        .readFile(path.join(repoRoot, directory, "package.json"), "utf8")
        .then(
          (source) =>
            JSON.parse(source) as { name?: string; private?: boolean },
        )
        .catch(() => undefined);
      if (manifest?.name && !manifest.private) {
        packages.push({ directory, name: manifest.name });
      }
    }
  }
  return packages;
}

function snapshot(directory: string): Map<string, string> {
  return new Map(
    walkFiles(directory).map((file) => [
      path.relative(directory, file).split(path.sep).join("/"),
      createHash("sha256").update(readFileSync(file)).digest("hex"),
    ]),
  );
}

function assertSameOutput(
  actual: Map<string, string>,
  expected: Map<string, string>,
  label: string,
): void {
  assert.deepEqual([...actual], [...expected], label);
}

async function waitForFile(file: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (
      await fs
        .stat(file)
        .then(() => true)
        .catch(() => false)
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Checkpoint was not reached: ${file}`);
}

async function interruptBuild(
  cli: string,
  site: string,
  checkpoint: string,
  occurrence = 1,
): Promise<void> {
  const signal = path.join(site, `.fault-${checkpoint}.signal`);
  const child = spawn(process.execPath, [cli, "build"], {
    cwd: site,
    env: {
      ...process.env,
      NODE_ENV: "test",
      RIEBECKITE_SSG_FAULT_INJECTION: "1",
      RIEBECKITE_SSG_FAULT_POINT: checkpoint,
      RIEBECKITE_SSG_FAULT_OCCURRENCE: String(occurrence),
      RIEBECKITE_SSG_FAULT_SIGNAL_FILE: signal,
    },
    stdio: "pipe",
  });
  await waitForFile(signal);
  child.kill("SIGKILL");
  const exit = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) =>
    child.once("exit", (code, signal_) => resolve({ code, signal: signal_ })),
  );
  assert.notEqual(exit.code, 0, `${checkpoint}: interrupted build succeeded`);
}

async function build(cli: string, site: string, full = false): Promise<void> {
  const result = run(
    process.execPath,
    [cli, "build", ...(full ? ["--full"] : [])],
    {
      cwd: site,
      env: { NODE_ENV: "test", RIEBECKITE_BUILD_CONCURRENCY: "1" },
    },
  );
  assert.equal(result.status, 0, result.output);
}

async function changeContent(site: string, index: number): Promise<void> {
  const file = path.join(site, "content", "notes", "fault-recovery.md");
  await fs.writeFile(
    file,
    `---\ntitle: Fault recovery ${index}\nvisibility: public\n---\n\nFault recovery ${index}.\n`,
    "utf8",
  );
}

async function addOrphans(site: string): Promise<void> {
  const directory = path.join(site, ".riebeckite", "ssg-output-cache.entries");
  await Promise.all(
    ["0".repeat(64), "1".repeat(64), "2".repeat(64)].map((name) =>
      fs.writeFile(path.join(directory, name), name, "utf8"),
    ),
  );
}

async function main(): Promise<void> {
  const workspace = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-fault-"),
  );
  const tarballs = path.join(workspace, "tarballs");
  const site = path.join(workspace, "site");
  try {
    await fs.mkdir(tarballs, { recursive: true });
    const packed = await packPackages(tarballs, {
      repoRoot,
      packages: await discoverPackages(),
      concurrency: 1,
      logger,
    });
    const sourceCli = path.join(
      repoRoot,
      "packages",
      "cli",
      "bin",
      "riebeckite.mjs",
    );
    assert.equal(
      run(process.execPath, [sourceCli, "init", site], { cwd: repoRoot })
        .status,
      0,
    );
    writeFileDependencies(site, packed);
    assert.equal(
      run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
        cwd: site,
        env: { RIEBECKITE_BUILD_CONCURRENCY: "1" },
      }).status,
      0,
    );
    const cli = path.join(
      site,
      "node_modules",
      "@riebeckite",
      "cli",
      "bin",
      "riebeckite.mjs",
    );
    await build(cli, site);
    for (const checkpoint of selectedCheckpoints()) {
      await changeContent(site, checkpoints.indexOf(checkpoint));
      if (checkpoint === "gc-entry-delete") await addOrphans(site);
      await interruptBuild(
        cli,
        site,
        checkpoint,
        checkpoint === "gc-entry-delete" ? 2 : 1,
      );
      await build(cli, site);
      const recovered = snapshot(path.join(site, "dist"));
      await build(cli, site, true);
      assertSameOutput(
        recovered,
        snapshot(path.join(site, "dist")),
        checkpoint,
      );
    }
    logger.step("all CLI fault recovery checkpoints matched full builds");
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
