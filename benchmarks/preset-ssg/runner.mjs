import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  applyScenario,
  compareSnapshots,
  createBenchmarkContent,
  localizationScenarioNames,
  removeSafeTemporaryDirectory,
  scenarioNames,
  snapshotTree,
} from "./lib.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const appRoot = path.join(root, "apps", "web");
const appRequire = createRequire(path.join(appRoot, "package.json"));
const execFileAsync = promisify(execFile);
const args = parseArgs(process.argv.slice(2));
const presets = listArg(args.presets) ?? ["starter", "showcase"];
const sizes = (listArg(args.sizes) ?? ["100", "1000"]).map(Number);
const scenarios = listArg(args.scenarios) ?? scenarioNames;
const runs = positiveIntegerArg(args.runs, 1, "runs");
const metricsEnabled = args.metrics !== "false";
const workRoot = path.resolve(
  args.workRoot ?? path.join(appRoot, ".riebeckite", "preset-ssg-benchmark"),
);
const resultsDirectory = path.resolve(
  args.out ?? path.join(root, "benchmarks", "results"),
);
const stamp = new Date()
  .toISOString()
  .replaceAll(":", "-")
  .replaceAll(".", "-");
const jsonPath = args.resume
  ? path.resolve(args.resume)
  : path.join(resultsDirectory, `${stamp}-preset-ssg.json`);
const markdownPath = jsonPath.replace(/\.json$/u, ".md");

if (args.buildOnce) {
  process.stdout.write(
    `${JSON.stringify(await buildOnce(JSON.parse(args.buildOnce)))}\n`,
  );
  process.exit(0);
}

const { scaffoldRiebeckiteSite } = await import(
  pathToFileURL(
    path.join(root, "packages/create-riebeckite/src/scaffold/index.ts"),
  )
);
const { scaffoldPresets } = await import(
  pathToFileURL(
    path.join(root, "packages/create-riebeckite/src/scaffold/presets.ts"),
  )
);
const rows = args.resume
  ? JSON.parse(await fs.readFile(jsonPath, "utf8")).rows
  : [];
if (!Array.isArray(rows))
  throw new Error(`Invalid benchmark report: ${jsonPath}`);
await fs.mkdir(resultsDirectory, { recursive: true });
let workspaceBuilt = false;
for (const preset of presets) {
  if (!(preset in scaffoldPresets))
    throw new Error(`Unknown official preset: ${preset}`);
  for (const size of sizes) {
    for (const scenario of scenarios) {
      if (
        !scenarioNames.includes(scenario) &&
        !localizationScenarioNames.includes(scenario)
      )
        throw new Error(`Unknown scenario: ${scenario}`);
      if (
        rows.some(
          (row) =>
            row.preset === preset &&
            row.size === size &&
            row.scenario === scenario,
        )
      ) {
        process.stdout.write(
          `Skipping completed ${preset}/${size}/${scenario}\n`,
        );
        continue;
      }
      if (!workspaceBuilt) {
        await buildWorkspacePackages();
        workspaceBuilt = true;
      }
      const result = await runScenario({ preset, size, scenario, runs });
      rows.push(result);
      await writeReport(rows);
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  }
}
process.stdout.write(`Saved ${jsonPath}\nSaved ${markdownPath}\n`);

async function writeReport(rows) {
  const report = {
    generatedAt: new Date().toISOString(),
    measurement: `${runs} independent sample${runs === 1 ? "" : "s"} per preset, size, and scenario`,
    runs,
    metricsEnabled,
    environment: environment(),
    presets: Object.fromEntries(
      presets.map((name) => [
        name,
        presetRecord(
          name,
          scaffoldPresets[name],
          rows.find((row) => row.preset === name)?.generatedConfigPluginOrder ??
            [],
        ),
      ]),
    ),
    rows,
  };
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(markdownPath, markdownReport(report), "utf8");
}

async function runScenario({ preset, size, scenario, runs }) {
  const samples = [];
  for (let run = 1; run <= runs; run += 1) {
    samples.push(await runScenarioSample({ preset, size, scenario, run }));
  }
  const medianSample = samples[Math.floor(samples.length / 2)];
  return {
    ...medianSample,
    wallTimeMs: median(samples.map((sample) => sample.wallTimeMs)),
    peakRssMb: median(samples.map((sample) => sample.peakRssMb)),
    cleanWallTimeMs: median(samples.map((sample) => sample.cleanWallTimeMs)),
    wallTimeRangeMs: range(samples.map((sample) => sample.wallTimeMs)),
    cleanWallTimeRangeMs: range(
      samples.map((sample) => sample.cleanWallTimeMs),
    ),
    samples,
  };
}

async function runScenarioSample({ preset, size, scenario, run }) {
  const runDirectory = path.join(
    workRoot,
    preset,
    String(size),
    scenario,
    `run-${run}`,
  );
  await removeSafeTemporaryDirectory(runDirectory, workRoot);
  const incrementalSite = path.join(runDirectory, "incremental");
  const generatedConfigPluginOrder = await createSite(
    incrementalSite,
    preset,
    size,
  );
  if (scenario !== "cold") await invokeBuild(incrementalSite, "baseline");
  await applyScenario({
    contentDirectory: path.join(incrementalSite, "content"),
    count: size,
    scenario,
    preset,
  });
  const incremental = await invokeBuild(incrementalSite, "incremental");
  const incrementalOutput = await snapshotTree(
    path.join(incrementalSite, "dist"),
  );
  await fs.rm(path.join(incrementalSite, ".riebeckite"), {
    recursive: true,
    force: true,
  });
  await fs.rm(path.join(incrementalSite, "dist"), {
    recursive: true,
    force: true,
  });
  const clean = await invokeBuild(incrementalSite, "clean");
  const comparison = compareSnapshots(
    incrementalOutput,
    await snapshotTree(path.join(incrementalSite, "dist")),
  );
  return {
    preset,
    size,
    scenario,
    run,
    generatedConfigPluginOrder,
    ...incremental,
    cleanWallTimeMs: clean.wallTimeMs,
    equivalence: comparison,
    nondeterminism: comparison.equivalent
      ? null
      : "Output content differs; see differences. No paths are excluded.",
  };
}

async function createSite(siteRoot, preset, count) {
  await scaffoldRiebeckiteSite({
    targetDirectory: siteRoot,
    name: `benchmark-${preset}-${count}`,
    preset,
    site: {
      title: `Benchmark ${preset}`,
      baseUrl: "https://benchmark.example.test",
    },
  });
  await linkWorkspacePackages(siteRoot);
  await createBenchmarkContent({
    contentDirectory: path.join(siteRoot, "content"),
    count,
    preset,
  });
  return generatedPluginOrder(
    await fs.readFile(path.join(siteRoot, "riebeckite.config.ts"), "utf8"),
  );
}

async function buildWorkspacePackages() {
  await execFileAsync(
    process.execPath,
    [path.join(root, "scripts", "build_packages.mjs")],
    {
      cwd: root,
      env: process.env,
      maxBuffer: 1024 * 1024 * 8,
    },
  );
}

async function linkWorkspacePackages(siteRoot) {
  const nodeModulesDirectory = path.join(siteRoot, "node_modules");
  const namespaceDirectory = path.join(siteRoot, "node_modules", "@riebeckite");
  await fs.mkdir(namespaceDirectory, { recursive: true });
  const packageRoots = [
    path.join(root, "packages"),
    path.join(root, "packages", "integrations"),
    path.join(root, "packages", "plugins"),
    path.join(root, "packages", "themes"),
  ];
  const packageDirectories = (
    await Promise.all(
      packageRoots.map(async (packageRoot) =>
        (
          await fs.readdir(packageRoot, { withFileTypes: true })
        )
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(packageRoot, entry.name)),
      ),
    )
  ).flat();
  for (const directory of packageDirectories) {
    const packagePath = path.join(directory, "package.json");
    const packageJson = await fs
      .readFile(packagePath, "utf8")
      .then((source) => JSON.parse(source))
      .catch(() => undefined);
    if (
      typeof packageJson?.name !== "string" ||
      !packageJson.name.startsWith("@riebeckite/")
    ) {
      continue;
    }
    const destination = path.join(
      namespaceDirectory,
      packageJson.name.slice("@riebeckite/".length),
    );
    await fs.symlink(directory, destination, "junction");
  }
  const runtimeDependencies = await fs.readdir(
    path.join(appRoot, "node_modules"),
    {
      withFileTypes: true,
    },
  );
  for (const dependency of runtimeDependencies) {
    if (
      (!dependency.isDirectory() && !dependency.isSymbolicLink()) ||
      dependency.name.startsWith(".")
    )
      continue;
    if (dependency.name === "@riebeckite") continue;
    const source = path.join(appRoot, "node_modules", dependency.name);
    if (!dependency.name.startsWith("@")) {
      await fs.symlink(
        await fs.realpath(source),
        path.join(nodeModulesDirectory, dependency.name),
        "junction",
      );
      continue;
    }
    const scopeDirectory = path.join(nodeModulesDirectory, dependency.name);
    await fs.mkdir(scopeDirectory, { recursive: true });
    const scopedDependencies = await fs.readdir(source, {
      withFileTypes: true,
    });
    for (const scopedDependency of scopedDependencies) {
      if (!scopedDependency.isDirectory() && !scopedDependency.isSymbolicLink())
        continue;
      const scopedSource = path.join(source, scopedDependency.name);
      await fs.symlink(
        await fs.realpath(scopedSource),
        path.join(scopeDirectory, scopedDependency.name),
        "junction",
      );
    }
  }
  await fs.symlink(
    await fs.realpath(
      path.join(
        root,
        "packages",
        "plugins",
        "mermaid",
        "node_modules",
        "puppeteer",
      ),
    ),
    path.join(nodeModulesDirectory, "puppeteer"),
    "junction",
  );
  await linkJunctionIfAbsent(
    path.join(
      root,
      "packages",
      "plugins",
      "excalidraw",
      "node_modules",
      "lz-string",
    ),
    path.join(nodeModulesDirectory, "lz-string"),
  );
}

async function linkJunctionIfAbsent(source, destination) {
  const resolvedSource = await fs.realpath(source);
  try {
    const existing = await fs.lstat(destination);
    if (!existing.isSymbolicLink())
      throw new Error(
        `Refusing to replace non-link dependency: ${destination}`,
      );
    if ((await fs.realpath(destination)) !== resolvedSource)
      throw new Error(
        `Refusing to replace mismatched dependency link: ${destination}`,
      );
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await fs.symlink(resolvedSource, destination, "junction");
}

async function invokeBuild(siteRoot, label) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(import.meta.url),
      "--buildOnce",
      JSON.stringify({ siteRoot, label, metricsEnabled }),
    ],
    { cwd: root, maxBuffer: 1024 * 1024 * 8 },
  );
  return JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
}

async function buildOnce({ siteRoot, label, metricsEnabled = true }) {
  const { build, defineConfig } = await import(
    pathToFileURL(appRequire.resolve("vite")).href
  );
  const { default: honox } = await import(
    pathToFileURL(appRequire.resolve("honox/vite")).href
  );
  const { default: viteBuild } = await import(
    pathToFileURL(
      path.join(
        appRoot,
        "node_modules/@hono/vite-build/dist/adapter/node/index.mjs",
      ),
    ).href
  );
  const { riebeckiteVite } = await import(
    pathToFileURL(path.join(root, "packages/integrations/honox/index.ts")).href
  );
  const metricsDirectory = path.join(siteRoot, ".riebeckite", "benchmark");
  const metricsPath = path.join(metricsDirectory, `${label}.json`);
  if (metricsEnabled) await fs.mkdir(metricsDirectory, { recursive: true });
  const samples = [process.memoryUsage().rss];
  const sampler = setInterval(
    () => samples.push(process.memoryUsage().rss),
    25,
  );
  const started = performance.now();
  if (metricsEnabled) process.env.RIEBECKITE_SSG_METRICS_FILE = metricsPath;
  try {
    await build(
      defineConfig({
        root: siteRoot,
        configFile: false,
        resolve: {
          alias: [
            {
              find: /^@riebeckite\/core$/,
              replacement: path.join(root, "packages/core/index.ts"),
            },
            {
              find: /^@riebeckite\/honox\/server$/,
              replacement: path.join(
                root,
                "packages/integrations/honox/dist/server.js",
              ),
            },
            {
              find: /^@riebeckite\/honox$/,
              replacement: path.join(
                root,
                "packages/integrations/honox/index.ts",
              ),
            },
          ],
        },
        plugins: [
          honox({ client: { input: ["/app/client.ts"] } }),
          ...riebeckiteVite(),
          viteBuild(),
        ],
        logLevel: "silent",
      }),
    );
  } finally {
    clearInterval(sampler);
    delete process.env.RIEBECKITE_SSG_METRICS_FILE;
  }
  samples.push(process.memoryUsage().rss);
  const metrics = metricsEnabled
    ? JSON.parse(await fs.readFile(metricsPath, "utf8"))
    : {};
  return {
    wallTimeMs: Math.round(performance.now() - started),
    peakRssMb: Math.round(Math.max(...samples) / 1024 / 1024),
    contentProcessed: metricNumber(metrics, "processedContentCount"),
    contentReused: metricNumber(metrics, "reusedContentCount"),
    outputRendered: metricNumber(metrics, "renderedOutputCount"),
    outputReused: metricNumber(metrics, "reusedOutputCount"),
    ssrRouteCount: metricNumber(metrics, "renderedRouteCount"),
    outputCacheHit: metricNumber(metrics, "cacheEntriesRead"),
    outputCacheMiss: Math.max(
      0,
      metricNumber(metrics, "candidateOutputCount") -
        metricNumber(metrics, "cacheEntriesRead"),
    ),
    manifestHooksExecuted: metricNumber(metrics, "manifestHooksExecuted"),
    manifestHooksReused: metricNumber(metrics, "manifestHooksReused"),
    manifestHookCacheHit: metricNumber(metrics, "manifestHookCacheHit"),
    manifestHookCacheMiss: metricNumber(metrics, "manifestHookCacheMiss"),
    manifestHookDurationMs: Math.round(
      metricNumber(metrics, "manifestHookDurationMs"),
    ),
    fastPathApplied:
      metricNumber(metrics, "renderedRouteCount") === 0 &&
      !metrics.fullRegenerationRequired,
    fullRegenerationRequired: Boolean(metrics.fullRegenerationRequired),
    globalOrUnknownDependency: Boolean(metrics.fullRegenerationRequired),
    outputWriteTimeMs: Math.round(metrics.timingsMs?.outputWrite ?? 0),
    metricsCollected: metricsEnabled,
    spansMs: Object.fromEntries(
      Object.entries(metrics.timingsMs ?? {}).map(([name, duration]) => [
        name,
        Math.round(duration),
      ]),
    ),
    rawMetrics: metrics,
  };
}

function metricNumber(metrics, key) {
  return Number(metrics[key] ?? 0);
}
function positiveIntegerArg(value, fallback, name) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`--${name} must be a positive integer`);
  return parsed;
}
function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}
function range(values) {
  return { min: Math.min(...values), max: Math.max(...values) };
}
function presetRecord(name, preset, generatedConfigPluginOrder) {
  return {
    name,
    plugins: preset.plugins.map((plugin) => ({
      package: plugin.package,
      factory: plugin.factory,
    })),
    pluginOrder: preset.plugins.map((plugin) => plugin.package),
    generatedConfigPluginOrder,
  };
}
function environment() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: os.cpus()[0]?.model ?? "unknown",
    cpuCount: os.cpus().length,
    memoryMb: Math.round(os.totalmem() / 1024 / 1024),
  };
}
function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    parsed[key] =
      values[index + 1] && !values[index + 1].startsWith("--")
        ? values[++index]
        : "true";
  }
  return parsed;
}
function listArg(value) {
  return value && value !== "true"
    ? value.split(/[\s,]+/).filter(Boolean)
    : undefined;
}
function generatedPluginOrder(config) {
  return [...config.matchAll(/^\s{4}(\w+)\(/gm)].map((match) => match[1]);
}
function markdownReport(report) {
  const lines = [
    "# Official Preset SSG benchmark",
    "",
    `Measured at: ${report.generatedAt}`,
    "",
    `${report.measurement}. Wall and clean values are medians; ranges are retained in JSON samples.`,
    "",
    "| Preset | Size | Scenario | Wall ms | RSS MB | Processed / Reused | Rendered / Reused | Manifest hooks executed / reused | Manifest cache hit / miss | Manifest hook ms | SSR routes | Cache hit / miss | Fast path | Full regeneration | Global / unknown | Write ms | Equivalent |",
    "| --- | ---: | --- | ---: | ---: | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | ---: | --- |",
  ];
  for (const row of report.rows)
    lines.push(
      `| ${row.preset} | ${row.size} | ${row.scenario} | ${row.wallTimeMs} | ${row.peakRssMb} | ${row.contentProcessed} / ${row.contentReused} | ${row.outputRendered} / ${row.outputReused} | ${row.manifestHooksExecuted} / ${row.manifestHooksReused} | ${row.manifestHookCacheHit} / ${row.manifestHookCacheMiss} | ${row.manifestHookDurationMs} | ${row.ssrRouteCount} | ${row.outputCacheHit} / ${row.outputCacheMiss} | ${row.fastPathApplied} | ${row.fullRegenerationRequired} | ${row.globalOrUnknownDependency} | ${row.outputWriteTimeMs} | ${row.equivalence.equivalent} |`,
    );
  lines.push("", "## Plugin order");
  for (const [name, preset] of Object.entries(report.presets))
    lines.push(`- ${name} packages: ${preset.pluginOrder.join(", ")}`);
  for (const [name, preset] of Object.entries(report.presets))
    lines.push(
      `- ${name} generated config: ${preset.generatedConfigPluginOrder.join(", ")}`,
    );
  return `${lines.join("\n")}\n`;
}
