import fs from "node:fs/promises";
import path from "node:path";
import {
  args,
  baseDir,
  environment,
  l10n,
  operation,
  profiles,
  repeats,
  resultsDir,
  scenarios,
  sizes,
  timestamp,
} from "./bench_core_config.mjs";
import { measure } from "./bench_core_measure.mjs";
import { summarize } from "./bench_core_metrics.mjs";
import { SCENARIO_DEFINITIONS } from "./bench_core_scenarios.mjs";
import { profileConfig } from "./lib/vault.mjs";

const allRows = [];
const outFile = path.join(resultsDir, `${timestamp()}-core.json`);
await fs.mkdir(resultsDir, { recursive: true });

for (const profile of profiles) {
  const config = profileConfig(profile);
  for (const size of sizes) {
    const sizeRows = [];
    const samplesByScenario = new Map();
    for (let runIndex = 0; runIndex < repeats; runIndex++) {
      const runDir = path.join(baseDir, `${profile}-${size}`, String(runIndex));
      for (const scenarioName of scenarios) {
        const definition = SCENARIO_DEFINITIONS[scenarioName];
        if (!definition) throw new Error(`Unknown scenario: ${scenarioName}`);
        const directory = path.join(runDir, "vault");
        const cacheDirectory = path.join(runDir, "cache");
        await fs.rm(runDir, { recursive: true, force: true });
        const vault = await generateVault(directory, {
          size,
          profile,
          seed: 1234 + runIndex,
          l10n: Boolean(l10n),
        });
        let baseline = null;
        if (definition.warm !== false && definition.name !== "cold") {
          baseline = await measure({
            directory,
            cacheDirectory,
            pluginVersion: "v1",
          });
        }
        await definition.prepare?.({
          directory,
          config,
          size,
          vault,
          runIndex,
        });
        const sample = await measure({
          directory,
          cacheDirectory,
          pluginVersion: definition.pluginVersion ?? "v1",
          configMutate: definition.configMutate,
        });
        const samples = samplesByScenario.get(scenarioName) ?? [];
        samples.push({ ...sample, baselineWallClockMs: baseline?.wallClockMs });
        samplesByScenario.set(scenarioName, samples);
      }
    }
    for (const [scenarioName, samples] of samplesByScenario) {
      const row = summarize(scenarioName, samples);
      sizeRows.push({ profile, size, ...row });
      allRows.push({ profile, size, ...row });
      console.log(
        JSON.stringify({
          profile,
          size,
          scenario: scenarioName,
          runs: row.runs,
          wallClockMs: row.wallClockMs,
          wallClockMin: row.wallClockMsMin,
          wallClockMax: row.wallClockMsMax,
          peakRssMb: row.peakRssMb,
          processed: row.processedContentCount,
          reused: row.reusedContentCount,
          cacheHits: row.cacheHits,
          cacheMisses: row.cacheMisses,
          affected: row.invalidatedContentCount,
        }),
      );
    }
    await writeResults();
  }
}

await writeResults();
printTable(allRows, scenarios);

async function writeResults() {
  await fs.writeFile(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        environment: environment(),
        conditions: {
          cache: "enabled",
          incremental: true,
          operation,
          fixtureDirectory: "OS temporary directory",
          seed: "1234 + repeat index",
        },
        args,
        rows: allRows,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nWrote ${outFile}`);
}

function printTable(rows, scenarioNames) {
  const wanted = [
    "cold",
    "warm",
    "single-edit",
    "title-edit",
    "add",
    "delete",
    "asset-edit",
  ].filter((name) => scenarioNames.includes(name));
  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.profile}\t${row.size}`;
    const entry = byKey.get(key) ?? { profile: row.profile, size: row.size };
    entry[row.scenario] = row;
    byKey.set(key, entry);
  }
  const header = ["profile", "notes", ...wanted, "peakRSS(MB)"];
  const lines = [header.join("\t")];
  for (const entry of [...byKey.values()].sort(
    (left, right) =>
      left.profile.localeCompare(right.profile) || left.size - right.size,
  )) {
    const peak = Math.max(
      ...wanted
        .map((name) => entry[name]?.peakRssMb)
        .filter((value) => typeof value === "number"),
      entry.cold?.peakRssMb ?? 0,
    );
    lines.push(
      [
        entry.profile,
        entry.size,
        ...wanted.map((name) =>
          entry[name] ? `${entry[name].wallClockMs}ms` : "-",
        ),
        `${peak}MB`,
      ].join("\t"),
    );
  }
  console.log("\n=== Benchmark summary (median wall clock) ===");
  console.log(lines.join("\n"));
}

void PROFILE_NAMES;
