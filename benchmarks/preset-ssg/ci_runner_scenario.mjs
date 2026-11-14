import fs from "node:fs/promises";
import path from "node:path";
import { directorySize, restoreCache, saveCache } from "./ci_runner_cache.mjs";
import { keepRunDirectories, workRoot } from "./ci_runner_config.mjs";
import { medianOf } from "./ci_runner_report.mjs";
import { createSite, invokeBuild } from "./ci_runner_site.mjs";
import {
  applyScenario,
  compareSnapshots,
  removeSafeTemporaryDirectory,
  snapshotTree,
} from "./lib.mjs";

export async function runScenario({ preset, size, scenario, runs }) {
  const samples = [];
  for (let run = 1; run <= runs; run += 1) {
    samples.push(await runSample({ preset, size, scenario, run }));
    process.stdout.write(
      `  ${preset}/${size}/${scenario} run ${run}/${runs} done\n`,
    );
  }
  const median = {};
  for (const key of [
    "coldWallTimeMs",
    "incrementalWallTimeMs",
    "cleanWallTimeMs",
    "cacheSaveMs",
    "cacheRestoreMs",
    "cacheBytes",
    "contentCacheBytes",
    "contentStateBytes",
    "outputCacheBytes",
    "restoredBytes",
    "contentProcessed",
    "contentReused",
    "outputRendered",
    "outputReused",
    "ssrRouteCount",
    "outputCacheHit",
    "outputCacheMiss",
    "manifestHooksReused",
    "manifestHookDurationMs",
    "peakRssMb",
  ])
    median[key] = medianOf(samples.map((sample) => sample[key]));
  median.fastPathApplied = samples.every((s) => s.fastPathApplied);
  median.fullRegenerationRequired = samples.every(
    (s) => s.fullRegenerationRequired,
  );
  median.equivalence = samples.find((s) => s.equivalence)?.equivalence ?? {
    equivalent: false,
    differences: [],
  };
  return { preset, size, scenario, runs, median, samples };
}

export async function runSample({ preset, size, scenario, run }) {
  const runDirectory = path.join(
    workRoot,
    preset,
    String(size),
    scenario,
    `run-${run}`,
  );
  await removeSafeTemporaryDirectory(runDirectory, workRoot);
  const cacheStore = path.join(runDirectory, "cache-store");
  await fs.mkdir(cacheStore, { recursive: true });

  const cold = scenario === "cold";
  const baselineSite = path.join(runDirectory, "origin");
  if (cold) {
    await createSite(baselineSite, preset, size);
    const build = await invokeBuild(baselineSite, "cold");
    const output = await snapshotTree(path.join(baselineSite, "dist"));
    await fs.rm(path.join(baselineSite, ".riebeckite"), {
      recursive: true,
      force: true,
    });
    await fs.rm(path.join(baselineSite, "dist"), {
      recursive: true,
      force: true,
    });
    const clean = await invokeBuild(baselineSite, "clean");
    const equivalence = compareSnapshots(
      output,
      await snapshotTree(path.join(baselineSite, "dist")),
    );
    return finishSample(runDirectory, {
      ...build,
      preset,
      size,
      scenario,
      run,
      coldWallTimeMs: build.wallTimeMs,
      incrementalWallTimeMs: build.wallTimeMs,
      cleanWallTimeMs: clean.wallTimeMs,
      cacheSaveMs: null,
      cacheRestoreMs: null,
      cacheBytes: null,
      contentCacheBytes: null,
      contentStateBytes: null,
      outputCacheBytes: null,
      restoredBytes: null,
      equivalence,
    });
  }

  await createSite(baselineSite, preset, size);
  const baseline = await invokeBuild(baselineSite, "baseline");
  const saved = await saveCache(baselineSite, cacheStore);
  await fs.rm(baselineSite, { recursive: true, force: true });

  const freshSite = path.join(runDirectory, "fresh");
  await createSite(freshSite, preset, size);
  const restoreMs = await restoreCache(cacheStore, freshSite);
  const restoredBytes = await directorySize(
    path.join(freshSite, ".riebeckite"),
  );
  await applyScenario({
    contentDirectory: path.join(freshSite, "content"),
    count: size,
    scenario,
    preset,
  });
  const incremental = await invokeBuild(freshSite, "incremental");
  const incrementalOutput = await snapshotTree(path.join(freshSite, "dist"));
  if (keepRunDirectories)
    await fs.cp(
      path.join(freshSite, "dist"),
      path.join(runDirectory, "incremental-dist"),
      { recursive: true },
    );
  if (keepRunDirectories)
    await fs.copyFile(
      path.join(freshSite, ".riebeckite", "build", "content-state.json"),
      path.join(runDirectory, "incremental-content-state.json"),
    );
  await fs.rm(path.join(freshSite, ".riebeckite"), {
    recursive: true,
    force: true,
  });
  await fs.rm(path.join(freshSite, "dist"), { recursive: true, force: true });
  const clean = await invokeBuild(freshSite, "clean");
  const equivalence = compareSnapshots(
    incrementalOutput,
    await snapshotTree(path.join(freshSite, "dist")),
  );
  return finishSample(runDirectory, {
    ...incremental,
    preset,
    size,
    scenario,
    run,
    coldWallTimeMs: baseline.wallTimeMs,
    incrementalWallTimeMs: incremental.wallTimeMs,
    cleanWallTimeMs: clean.wallTimeMs,
    cacheSaveMs: saved.saveMs,
    cacheRestoreMs: restoreMs,
    cacheBytes: saved.bytes,
    contentCacheBytes: saved.contentCacheBytes,
    contentStateBytes: saved.contentStateBytes,
    outputCacheBytes: saved.outputCacheBytes,
    restoredBytes,
    equivalence,
  });
}

export async function finishSample(runDirectory, result) {
  if (!keepRunDirectories)
    await fs.rm(runDirectory, { recursive: true, force: true });
  return result;
}
