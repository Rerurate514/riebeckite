import fs from "node:fs/promises";
import path from "node:path";
import {
  applyScenario,
  compareSnapshots,
  removeSafeTemporaryDirectory,
  snapshotTree,
  summarize,
} from "./lib.mjs";
import { retainOutputs, workRoot } from "./runner_config.mjs";
import { createSite, invokeBuild } from "./runner_site.mjs";

export async function runScenario({ preset, size, scenario, runs }) {
  const summarizedMetrics = [
    "wallTimeMs",
    "cleanWallTimeMs",
    "processStartupElapsedMs",
    "cpuUserTimeMs",
    "cpuSystemTimeMs",
    "cpuTotalTimeMs",
    "filesystemReadCalls",
    "filesystemWriteCalls",
    "peakRssMb",
    "outputWriteTimeMs",
    "manifestHookDurationMs",
  ];
  const samples = [];
  for (let run = 1; run <= runs; run += 1) {
    samples.push(await runScenarioSample({ preset, size, scenario, run }));
  }
  const medianSample = samples[Math.floor(samples.length / 2)];
  const statistics = Object.fromEntries(
    summarizedMetrics.map((name) => [
      name,
      summarize(
        samples.map((sample) =>
          name === "cpuTotalTimeMs"
            ? sample.cpuUserTimeMs + sample.cpuSystemTimeMs
            : sample[name],
        ),
      ),
    ]),
  );
  const spanNames = [
    ...new Set(samples.flatMap((sample) => Object.keys(sample.spansMs ?? {}))),
  ].sort();
  for (const name of spanNames) {
    statistics[`spansMs.${name}`] = summarize(
      samples
        .map((sample) => sample.spansMs?.[name])
        .filter((value) => value !== undefined),
    );
  }
  return {
    ...medianSample,
    ...Object.fromEntries(
      summarizedMetrics.map((name) => [name, statistics[name].median]),
    ),
    wallTimeRangeMs: {
      min: statistics.wallTimeMs.min,
      max: statistics.wallTimeMs.max,
    },
    cleanWallTimeRangeMs: {
      min: statistics.cleanWallTimeMs.min,
      max: statistics.cleanWallTimeMs.max,
    },
    spansMs: Object.fromEntries(
      spanNames.map((name) => [name, statistics[`spansMs.${name}`].median]),
    ),
    equivalentAcrossRuns: samples.every(
      (sample) => sample.equivalence.equivalent,
    ),
    statistics,
    samples,
  };
}

export async function runScenarioSample({ preset, size, scenario, run }) {
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
  if (scenario !== "cold") {
    await invokeBuild(incrementalSite, "baseline");
    if (retainOutputs) {
      await fs.cp(
        path.join(incrementalSite, "dist"),
        path.join(runDirectory, "baseline-output"),
        { recursive: true },
      );
    }
  }
  if (scenario === "full") {
    await fs.rm(
      path.join(incrementalSite, ".riebeckite", "ssg-output-cache.json"),
      { force: true },
    );
  }
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
  if (retainOutputs) {
    await fs.cp(
      path.join(incrementalSite, "dist"),
      path.join(runDirectory, "incremental-output"),
      { recursive: true },
    );
  }
  await fs.rm(path.join(incrementalSite, ".riebeckite"), {
    recursive: true,
    force: true,
  });
  await fs.rm(path.join(incrementalSite, "dist"), {
    recursive: true,
    force: true,
  });
  const clean = await invokeBuild(incrementalSite, "clean");
  const cleanOutput = await snapshotTree(path.join(incrementalSite, "dist"));
  if (retainOutputs) {
    await fs.cp(
      path.join(incrementalSite, "dist"),
      path.join(runDirectory, "clean-output"),
      { recursive: true },
    );
  }
  const comparison = compareSnapshots(incrementalOutput, cleanOutput);
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

export function generatedPluginOrder(config) {
  return [...config.matchAll(/^\s{4}(\w+)\(/gm)].map((match) => match[1]);
}
