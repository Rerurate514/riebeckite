import fs from "node:fs/promises";
import os from "node:os";
import {
  jsonPath,
  markdownPath,
  metricsEnabled,
  presets,
  runs,
} from "./runner_config.mjs";

export async function writeReport(rows) {
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

export function markdownReport(report) {
  const lines = [
    "# Official Preset SSG benchmark",
    "",
    `Measured at: ${report.generatedAt}`,
    "",
    `${report.measurement}. Values are medians; p95, standard deviation, and ranges are retained in JSON statistics.`,
    "",
    "| Preset | Size | Scenario | Wall ms | Wall p95 | Wall σ | RSS MB | Processed / Reused | Rendered / Reused | Manifest hooks executed / reused | Manifest cache hit / miss | Manifest hook ms | SSR routes | Cache hit / miss | Fast path | Full regeneration | Global / unknown | Write ms | Equivalent |",
    "| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | ---: | --- |",
  ];
  for (const row of report.rows)
    lines.push(
      `| ${row.preset} | ${row.size} | ${row.scenario} | ${row.wallTimeMs} | ${row.statistics.wallTimeMs.p95} | ${row.statistics.wallTimeMs.stdev.toFixed(1)} | ${row.peakRssMb} | ${row.contentProcessed} / ${row.contentReused} | ${row.outputRendered} / ${row.outputReused} | ${row.manifestHooksExecuted} / ${row.manifestHooksReused} | ${row.manifestHookCacheHit} / ${row.manifestHookCacheMiss} | ${row.manifestHookDurationMs} | ${row.ssrRouteCount} | ${row.outputCacheHit} / ${row.outputCacheMiss} | ${row.fastPathApplied} | ${row.fullRegenerationRequired} | ${row.globalOrUnknownDependency} | ${row.outputWriteTimeMs} | ${row.equivalence.equivalent} |`,
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

export function listArg(value) {
  return value && value !== "true"
    ? value.split(/[\s,]+/).filter(Boolean)
    : undefined;
}

export function positiveIntegerArg(value, fallback, name) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`--${name} must be a positive integer`);
  return parsed;
}

export function presetRecord(name, preset, generatedConfigPluginOrder) {
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

export function environment() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: os.cpus()[0]?.model ?? "unknown",
    cpuCount: os.cpus().length,
    memoryMb: Math.round(os.totalmem() / 1024 / 1024),
  };
}
