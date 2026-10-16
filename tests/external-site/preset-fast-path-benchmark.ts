import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createLogger,
  type PackageSpec,
  packPackages,
  run,
  writeFileDependencies,
} from "@riebeckite/test/e2e";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const logger = createLogger("preset-fast-path-benchmark");
const keep = process.env.RIEBECKITE_PRESET_FAST_PATH_KEEP === "1";
const samplerPath = path.join(
  repoRoot,
  "tests",
  "external-site",
  "rss-sampler.mjs",
);
const samplerUrl = pathToFileURL(samplerPath).href;

const ALL_PRESETS = ["empty", "minimal", "starter", "showcase"] as const;
type PresetName = (typeof ALL_PRESETS)[number];

const FAST_PATH_CAPABLE: Readonly<Record<PresetName, boolean>> = {
  empty: true,
  minimal: true,
  starter: true,
  showcase: false,
};

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const presets: readonly PresetName[] = (() => {
  const filtered = parseList(process.env.RIEBECKITE_BENCH_PRESETS);
  return filtered.length > 0
    ? (filtered as readonly PresetName[])
    : ALL_PRESETS;
})();

const sizeOverride = parseList(process.env.RIEBECKITE_BENCH_SIZES).map(Number);
const runs = Number(process.env.RIEBECKITE_BENCH_RUNS ?? "3");

type Scenario = "cold" | "no-change" | "full";

interface Trial {
  readonly preset: PresetName;
  readonly size: number;
  readonly scenario: Scenario;
  readonly run: number;
  readonly wallTimeMs: number;
  readonly peakRssBytes: number;
  readonly exitCode: number;
  readonly fastPathUsed?: boolean;
}

function sizesFor(preset: PresetName): number[] {
  if (sizeOverride.length > 0) return sizeOverride;
  return FAST_PATH_CAPABLE[preset] ? [100, 1000] : [100];
}

async function discoverPackages(): Promise<PackageSpec[]> {
  const scanRoots = [
    "packages",
    "packages/integrations",
    "packages/plugins",
    "packages/themes",
  ];
  const specs: PackageSpec[] = [];
  for (const scanRoot of scanRoots) {
    const entries = await fsp
      .readdir(path.join(repoRoot, scanRoot), { withFileTypes: true })
      .catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifest = await fsp
        .readFile(
          path.join(repoRoot, scanRoot, entry.name, "package.json"),
          "utf8",
        )
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

function sectionFor(index: number): string {
  return String(Math.floor(index / 20)).padStart(3, "0");
}

function benchmarkNoteSource(index: number): string {
  const section = sectionFor(index);
  return [
    "---",
    `title: Benchmark Note ${index}`,
    "publish: true",
    "tags:",
    "  - benchmark",
    `  - section-${section}`,
    "---",
    "",
    `Benchmark note ${index}.`,
    "",
    "Body line one.",
    "Body line two.",
    "Body line three.",
    "",
  ].join("\n");
}

async function writeBenchmarkContent(
  contentDir: string,
  count: number,
): Promise<void> {
  await fsp.rm(path.join(contentDir, "benchmark"), {
    recursive: true,
    force: true,
  });
  for (let index = 0; index < count; index += 1) {
    const section = sectionFor(index);
    const relative = path.join(
      "benchmark",
      `section-${section}`,
      `note-${String(index).padStart(5, "0")}.md`,
    );
    const target = path.join(contentDir, relative);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, benchmarkNoteSource(index));
  }
}

function parseFastPathUsed(output: string): boolean | undefined {
  const used = /^ {2}Used {2,}(yes|no)\s*$/m.exec(output)?.[1];
  return used === "yes" ? true : used === "no" ? false : undefined;
}

interface Measurement {
  readonly wallTimeMs: number;
  readonly peakRssBytes: number;
  readonly exitCode: number;
  readonly fastPathUsed?: boolean;
}

function measure(
  siteDir: string,
  installedCli: string,
  rssFile: string,
  args: readonly string[],
): Measurement {
  fs.rmSync(rssFile, { force: true });
  const start = performance.now();
  const result = run(
    process.execPath,
    ["--import", samplerUrl, installedCli, ...args],
    {
      cwd: siteDir,
      env: {
        RIEBECKITE_BUILD_CONCURRENCY: "1",
        RIEBECKITE_BENCH_RSS_FILE: rssFile,
      },
    },
  );
  const wallTimeMs = performance.now() - start;
  const output = `${result.stdout}${result.stderr}`;
  const peakRssBytes = fs.existsSync(rssFile)
    ? Number(fs.readFileSync(rssFile, "utf8"))
    : 0;
  return {
    wallTimeMs,
    peakRssBytes,
    exitCode: result.status ?? 1,
    fastPathUsed: parseFastPathUsed(output),
  };
}

function resetSite(siteDir: string): void {
  fs.rmSync(path.join(siteDir, "dist"), { recursive: true, force: true });
  fs.rmSync(path.join(siteDir, ".riebeckite"), {
    recursive: true,
    force: true,
  });
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

function toMb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

async function runPreset(
  preset: PresetName,
  workspaceRoot: string,
  packed: Awaited<ReturnType<typeof packPackages>>,
  trials: Trial[],
): Promise<void> {
  const siteDir = path.join(workspaceRoot, preset);
  const rssFile = path.join(workspaceRoot, `${preset}-rss.txt`);
  const repoCli = path.join(
    repoRoot,
    "packages",
    "cli",
    "bin",
    "riebeckite.mjs",
  );
  logger.step(`[${preset}] scaffolding`);
  const scaffold = run(
    process.execPath,
    [repoCli, "init", siteDir, "--preset", preset],
    { cwd: repoRoot, env: { RIEBECKITE_BUILD_CONCURRENCY: "1" } },
  );
  if (scaffold.status !== 0) {
    throw new Error(`[${preset}] scaffold failed: ${scaffold.stderr}`);
  }
  writeFileDependencies(siteDir, packed);

  logger.step(`[${preset}] npm install`);
  const install = run(
    "npm",
    ["install", "--no-audit", "--no-fund", "--loglevel=error"],
    { cwd: siteDir, env: { RIEBECKITE_BUILD_CONCURRENCY: "1" } },
  );
  if (install.status !== 0) {
    throw new Error(`[${preset}] npm install failed: ${install.stderr}`);
  }

  const installedCli = path.join(
    siteDir,
    "node_modules",
    "@riebeckite",
    "cli",
    "bin",
    "riebeckite.mjs",
  );
  const contentDir = path.join(siteDir, "content");

  for (const size of sizesFor(preset)) {
    await writeBenchmarkContent(contentDir, size);
    logger.step(`[${preset}] size ${size}`);
    for (let current = 1; current <= runs; current += 1) {
      resetSite(siteDir);
      const cold = measure(siteDir, installedCli, rssFile, ["profile"]);
      trials.push({ preset, size, scenario: "cold", run: current, ...cold });
      logger.step(
        `  [${preset}] ${size} run ${current} cold ${Math.round(cold.wallTimeMs)}ms rss ${toMb(cold.peakRssBytes)}MB exit ${cold.exitCode}`,
      );
      if (cold.exitCode !== 0) throw new Error(`[${preset}] cold build failed`);

      const noChange = measure(siteDir, installedCli, rssFile, ["profile"]);
      trials.push({
        preset,
        size,
        scenario: "no-change",
        run: current,
        ...noChange,
      });
      logger.step(
        `  [${preset}] ${size} run ${current} no-change ${Math.round(noChange.wallTimeMs)}ms rss ${toMb(noChange.peakRssBytes)}MB fastPath ${noChange.fastPathUsed}`,
      );

      const full = measure(siteDir, installedCli, rssFile, [
        "profile",
        "--full",
      ]);
      trials.push({ preset, size, scenario: "full", run: current, ...full });
      logger.step(
        `  [${preset}] ${size} run ${current} full ${Math.round(full.wallTimeMs)}ms rss ${toMb(full.peakRssBytes)}MB exit ${full.exitCode}`,
      );
      if (full.exitCode !== 0) throw new Error(`[${preset}] full build failed`);
    }
  }
}

function summarize(trials: readonly Trial[]): {
  preset: PresetName;
  size: number;
  scenario: Scenario;
  medianWallTimeMs: number;
  medianPeakRssMb: number;
  maxPeakRssMb: number;
}[] {
  const groups = new Map<string, Trial[]>();
  for (const trial of trials) {
    const key = `${trial.preset}\u0000${trial.size}\u0000${trial.scenario}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(trial);
    groups.set(key, bucket);
  }
  return [...groups.values()]
    .map((bucket) => {
      const first = bucket[0] as Trial;
      return {
        preset: first.preset,
        size: first.size,
        scenario: first.scenario,
        medianWallTimeMs: Math.round(
          median(bucket.map((trial) => trial.wallTimeMs)),
        ),
        medianPeakRssMb: toMb(
          median(bucket.map((trial) => trial.peakRssBytes)),
        ),
        maxPeakRssMb: toMb(
          Math.max(...bucket.map((trial) => trial.peakRssBytes)),
        ),
      };
    })
    .sort(
      (left, right) =>
        left.preset.localeCompare(right.preset) ||
        left.size - right.size ||
        left.scenario.localeCompare(right.scenario),
    );
}

async function main(): Promise<void> {
  const workspaceRoot = await fsp.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preset-fast-path-benchmark-"),
  );
  const tarballDir = path.join(workspaceRoot, "tarballs");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsDir = path.join(os.tmpdir(), "riebeckite-f5-benchmark-results");
  await fsp.mkdir(tarballDir, { recursive: true });
  await fsp.mkdir(resultsDir, { recursive: true });

  const trials: Trial[] = [];
  try {
    const packages = await discoverPackages();
    logger.step(`packing ${packages.length} packages`);
    const packed = await packPackages(tarballDir, {
      repoRoot,
      packages,
      concurrency: 1,
      logger,
    });
    for (const preset of presets) {
      logger.step(`===== preset ${preset} =====`);
      await runPreset(preset, workspaceRoot, packed, trials);
    }

    const summary = summarize(trials);
    const payload = { stamp, runs, trials, summary };
    const outputFile = path.join(resultsDir, `f5-benchmark-${stamp}.json`);
    await fsp.writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`);
    logger.step(`results written to ${outputFile}`);

    console.log("\nF5 CLI benchmark (median of runs)");
    console.log(
      "preset | size | scenario | median wall (s) | median peak RSS (MB) | max peak RSS (MB)",
    );
    for (const row of summary) {
      console.log(
        [
          row.preset,
          row.size,
          row.scenario,
          (row.medianWallTimeMs / 1000).toFixed(2),
          row.medianPeakRssMb,
          row.maxPeakRssMb,
        ].join(" | "),
      );
    }
  } finally {
    if (keep) {
      logger.step(`kept workspace ${workspaceRoot}`);
    } else {
      await fsp.rm(workspaceRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
