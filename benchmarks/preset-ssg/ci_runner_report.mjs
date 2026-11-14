import fs from "node:fs/promises";
import os from "node:os";
import {
  cacheOutput,
  jsonPath,
  markdownPath,
  resultsDirectory,
  runs,
} from "./ci_runner_config.mjs";

export function compact(row) {
  return {
    preset: row.preset,
    size: row.size,
    scenario: row.scenario,
    outputCacheCached: cacheOutput,
    coldMs: row.median.coldWallTimeMs,
    incrementalMs: row.median.incrementalWallTimeMs,
    cleanMs: row.median.cleanWallTimeMs,
    saveMs: row.median.cacheSaveMs,
    restoreMs: row.median.cacheRestoreMs,
    cacheBytes: row.median.cacheBytes,
    contentCacheBytes: row.median.contentCacheBytes,
    contentStateBytes: row.median.contentStateBytes,
    outputCacheBytes: row.median.outputCacheBytes,
    restoredBytes: row.median.restoredBytes,
    contentReused: row.median.contentReused,
    outputRendered: row.median.outputRendered,
    fastPath: row.median.fastPathApplied,
    full: row.median.fullRegenerationRequired,
    equal: row.median.equivalence.equivalent,
  };
}

export async function writeReport(rows) {
  const report = {
    generatedAt: new Date().toISOString(),
    kind: "ci-simulation",
    outputCacheCached: cacheOutput,
    note: `Local CI simulation: cache restore/save is emulated by copying the template-cached files into a fresh site directory at a different absolute path. ${cacheOutput ? "The SSG output cache (metadata, entries, and fast-path sidecar) is included, matching the v2 deploy template." : "The SSG output cache is excluded, matching the old v1 deploy template."} GitHub Actions cache transfer time is NOT included.`,
    runs,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: os.cpus()[0]?.model ?? "unknown",
      cpuCount: os.cpus().length,
      memoryMb: Math.round(os.totalmem() / 1024 / 1024),
    },
    rows,
  };
  await fs.mkdir(resultsDirectory, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(markdownPath, markdownReport(report), "utf8");
}

export function markdownReport(report) {
  const lines = [
    "# CI incremental build simulation",
    "",
    `Measured at: ${report.generatedAt}`,
    "",
    `Local CI simulation. ${report.runs} run(s) per (preset, size, scenario); medians shown.`,
    "",
    report.note,
    "",
    "| Preset | Size | Scenario | Cold ms | Incremental ms | Clean ms | Save ms | Restore ms | Cache bytes | Content cache bytes | State bytes | Output cache bytes | Restored bytes | Content reused | Output rendered | Fast path | Full regen | Equivalent |",
    "| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |",
  ];
  for (const row of report.rows) {
    const m = row.median;
    lines.push(
      `| ${row.preset} | ${row.size} | ${row.scenario} | ${m.coldWallTimeMs} | ${m.incrementalWallTimeMs} | ${m.cleanWallTimeMs} | ${m.cacheSaveMs ?? "N/A"} | ${m.cacheRestoreMs ?? "N/A"} | ${m.cacheBytes ?? "N/A"} | ${m.contentCacheBytes ?? "N/A"} | ${m.contentStateBytes ?? "N/A"} | ${m.outputCacheBytes ?? "N/A"} | ${m.restoredBytes ?? "N/A"} | ${m.contentReused} | ${m.outputRendered} | ${m.fastPathApplied} | ${m.fullRegenerationRequired} | ${m.equivalence.equivalent} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function medianOf(values) {
  const present = values.filter((value) => typeof value === "number");
  if (present.length === 0) return null;
  const sorted = [...present].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function metricNumber(metrics, key) {
  return Number(metrics[key] ?? 0);
}

export function parseArgs(values) {
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

export function positiveIntegerArg(value, fallback, name) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`--${name} must be a positive integer`);
  return parsed;
}

export function listArg(value) {
  return value && value !== "true"
    ? value.split(/[\s,]+/).filter(Boolean)
    : undefined;
}
