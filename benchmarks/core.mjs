import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  addNote,
  appendParagraph,
  appendWikilink,
  deleteNote,
  editAsset,
  editFrontmatter,
  generateVault,
  moveNote,
  PROFILE_NAMES,
  profileConfig,
} from "./lib/vault.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ContentManager, NoopLogger, SinkTracer, defineConfig, resolveConfig } =
  await import(pathToFileURL(path.join(root, "packages/core/index.ts")));

const args = parseArgs(process.argv.slice(2));
const profiles = listArg(args.profiles) ?? ["baseline", "realistic"];
const sizes = (listArg(args.sizes) ?? ["100", "1000", "5000", "10000"]).map(
  Number,
);
const scenarios = listArg(args.scenarios) ?? [
  "cold",
  "warm",
  "single-edit",
  "link-edit",
  "title-edit",
  "add",
  "delete",
  "frontmatter-edit",
  "public-draft",
  "hub-edit",
  "rename",
  "asset-edit",
  "config-edit",
  "plugin-edit",
];
const repeats = Number(args.repeats ?? 3);
const operation = args.operation ?? "build";
if (!["build", "output-change-set"].includes(operation)) {
  throw new Error(`Unknown operation: ${operation}`);
}
const baseDir = path.join(os.tmpdir(), "riebeckite-vault-benchmark");
const resultsDir = args.out
  ? path.resolve(args.out)
  : path.join(root, "benchmarks", "results");

const l10nPlugin = args.l10n
  ? (
      await import(
        pathToFileURL(path.join(root, "packages/plugins/l10n/index.ts"))
      )
    ).l10n({ defaultLang: "en", languages: ["en", "ja"] })
  : null;

const SCENARIO_DEFINITIONS = {
  cold: { name: "cold", warm: false },
  warm: { name: "warm" },
  "single-edit": {
    name: "single-edit",
    prepare: ({ directory, config, size }) =>
      appendParagraph(directory, config.depth, size - 1, "Single edit."),
  },
  "link-edit": {
    name: "link-edit",
    prepare: ({ directory, config, size }) =>
      appendWikilink(directory, config.depth, size - 1, 0),
  },
  "title-edit": {
    name: "title-edit",
    prepare: ({ directory, config, size }) =>
      editFrontmatter(directory, config.depth, size - 1, (yaml) =>
        yaml.replace(/^title:.*/m, "title: Edited title"),
      ),
  },
  add: {
    name: "add",
    prepare: ({ directory, config, size }) =>
      addNote(directory, config.depth, size),
  },
  delete: {
    name: "delete",
    prepare: ({ directory, config, size }) =>
      deleteNote(directory, config.depth, size - 1),
  },
  "frontmatter-edit": {
    name: "frontmatter-edit",
    prepare: ({ directory, config }) =>
      editFrontmatter(directory, config.depth, 0, (yaml) =>
        yaml.includes("tags:")
          ? yaml.replace(/tags:.*/, 'tags: ["edited-tag"]')
          : `${yaml}\ntags: ["edited-tag"]`,
      ),
  },
  "public-draft": {
    name: "public-draft",
    prepare: ({ directory, config }) =>
      editFrontmatter(directory, config.depth, 0, (yaml) =>
        yaml.replace(/^visibility:.*/m, "visibility: draft"),
      ),
  },
  "hub-edit": {
    name: "hub-edit",
    prepare: ({ directory, config }) =>
      appendParagraph(directory, config.depth, 0, "Hub edit."),
  },
  rename: {
    name: "rename",
    prepare: ({ directory, config }) =>
      moveNote(directory, config.depth, 0, "archive/note-00000.md"),
  },
  "asset-edit": {
    name: "asset-edit",
    prepare: ({ directory }) =>
      editAsset(directory, 0, "png", `asset changed ${Date.now()}`),
  },
  "config-edit": {
    name: "config-edit",
    configMutate: (config) => ({
      ...config,
      site: { ...config.site, title: "Benchmark Edited" },
    }),
  },
  "plugin-edit": {
    name: "plugin-edit",
    pluginVersion: "v2",
  },
};

const allRows = [];
await fs.mkdir(resultsDir, { recursive: true });
const outFile = path.join(resultsDir, `${timestamp()}-core.json`);

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
          l10n: Boolean(l10nPlugin),
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

async function measure(input) {
  const events = [];
  const spans = [];
  const memorySamples = [];
  sampleMemory(memorySamples, "before manager");
  const tracer = new SinkTracer({
    onEvent: (event) => events.push(event),
    onSpan: (span) => {
      spans.push(span);
      if (isMemorySpan(span.name))
        sampleMemory(memorySamples, `after ${span.name}`);
    },
  });
  let config = resolveConfig(
    defineConfig({
      site: { title: "Benchmark" },
      content: {
        directory: input.directory,
        filters: { publishStrategy: "selective" },
      },
      cache: { enabled: true, directory: input.cacheDirectory },
      plugins: [
        benchmarkPlugin(input.pluginVersion),
        ...(l10nPlugin ? [l10nPlugin] : []),
      ],
    }),
  );
  if (input.configMutate) config = input.configMutate(config);
  const startMemory = process.memoryUsage().rss;
  const start = performance.now();
  const manager = new ContentManager(input.directory, [], {
    config,
    observability: { logger: new NoopLogger(), tracer },
  });
  const peak = startPeakSampler(memorySamples);
  const manifest =
    operation === "build" ? await manager.build({ incremental: true }) : null;
  const outputChanges =
    operation === "output-change-set"
      ? await manager.getOutputChangeSet({ incremental: true })
      : null;
  if (globalThis.gc) globalThis.gc();
  const endWallClockMs = performance.now() - start;
  peak.stop();
  await manager.dispose();
  const endMemory = process.memoryUsage().rss;
  const peakMemory = summarizePeakMemory(memorySamples);
  const outputMetrics = events.find(
    (event) => event.name === "build.incremental.outputs",
  )?.attributes;
  const changeMetrics = events.find(
    (event) => event.name === "build.incremental",
  )?.attributes;
  return {
    wallClockMs: Math.round(endWallClockMs),
    changeAdded: toMetricNumber(changeMetrics?.added),
    changeChanged: toMetricNumber(changeMetrics?.changed),
    changeRemoved: toMetricNumber(changeMetrics?.removed),
    changeUnchanged: toMetricNumber(changeMetrics?.unchanged),
    processedContentCount: spans.filter(
      (span) => span.name === "content.process",
    ).length,
    reusedContentCount: events.filter((event) => event.name === "content.reuse")
      .length,
    cacheHits: events.filter(
      (event) =>
        event.name === "persistentContentCache.hit" &&
        event.attributes?.slug !== undefined,
    ).length,
    cacheMisses: events.filter(
      (event) =>
        event.name === "persistentContentCache.miss" &&
        event.attributes?.slug !== undefined,
    ).length,
    cacheBypass: events.filter(
      (event) => event.name === "persistentContentCache.bypass",
    ).length,
    invalidatedContentCount: Number(
      events.find((event) => event.name === "build.incremental")?.attributes
        ?.affected ?? 0,
    ),
    candidateOutputCount:
      toMetricNumber(outputMetrics?.candidateOutputCount) ??
      outputChanges?.candidateOutputCount ??
      (manifest
        ? manifest.publicEntries.length +
          manifest.pagePaths.length +
          manifest.generatedOutputs.length
        : 0),
    affectedOutputCount:
      toMetricNumber(outputMetrics?.affectedOutputCount) ??
      outputChanges?.affectedOutputCount ??
      0,
    removedOutputCount:
      toMetricNumber(outputMetrics?.removedOutputCount) ??
      outputChanges?.removedOutputCount ??
      0,
    unchangedOutputCount:
      toMetricNumber(outputMetrics?.unchangedOutputCount) ??
      outputChanges?.unchangedOutputCount ??
      0,
    fullOutputRegenerationRequired:
      outputMetrics?.fullRegenerationRequired ??
      outputChanges?.fullRegenerationRequired ??
      null,
    peakRssMb:
      peakMemory.rssMb ??
      Math.round(Math.max(startMemory, endMemory) / 1024 / 1024),
    peakHeapUsedMb: peakMemory.heapUsedMb,
    entries: manifest?.entries.length ?? 0,
    htmlBytes:
      manifest?.entries.reduce(
        (total, entry) => total + Buffer.byteLength(entry.html ?? "", "utf8"),
        0,
      ) ?? 0,
    phaseDurationsMs: summarizePhaseDurations(spans),
    phaseMetrics: summarizePhaseMetrics(spans, events),
    pluginTimings: summarizePluginTimings(spans),
    snapshot: manifest && input.snapshot ? takeSnapshot(manifest) : null,
    memorySamples,
  };
}

function takeSnapshot(manifest) {
  return {
    entries: manifest.entries
      .map((entry) => ({
        slug: entry.slug,
        contentId: entry.contentId ?? null,
        title: entry.title,
        permalink: entry.permalink,
        publicLocation: entry.publicLocation ?? null,
        publishing: entry.publishing ?? null,
        html: entry.html,
        aliases: [...(entry.aliases ?? [])].sort(),
        tags: [...(entry.tags ?? [])].sort(),
        links: (entry.links ?? [])
          .map((link) => `${link.kind}:${link.slug ?? link.raw}`)
          .sort(),
        backlinks: [...(entry.backlinks ?? [])].sort(),
        assets: (entry.assets ?? []).map((asset) => asset.path).sort(),
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug)),
    pagePaths: [...(manifest.pagePaths ?? [])].sort(),
    pageRoutes: [...(manifest.pageRoutes ?? [])]
      .map((route) => route.path ?? String(route))
      .sort(),
    generatedOutputs: (manifest.generatedOutputs ?? [])
      .map((output) => `${output.kind}:${output.path}`)
      .sort(),
    redirects: (manifest.redirects ?? [])
      .map(
        (redirect) => `${redirect.from}->${redirect.to ?? redirect.permalink}`,
      )
      .sort(),
  };
}

function benchmarkPlugin(version) {
  return {
    name: "benchmark-plugin",
    cacheVersion: version,
    processedContentCache: { version, dependencyMode: "tracked" },
  };
}

function isMemorySpan(name) {
  return [
    "content.discovery",
    "content.fingerprint",
    "content.read",
    "content.markdown",
    "content.index",
    "content.locations",
    "content.manifest.entries",
    "content.graph",
    "content.manifest",
  ].includes(name);
}

function startPeakSampler(samples) {
  const interval = setInterval(() => sampleMemory(samples, "interval"), 250);
  return { stop: () => clearInterval(interval) };
}

function sampleMemory(samples, label) {
  const memory = process.memoryUsage();
  samples.push({
    label,
    rssMb: toMb(memory.rss),
    heapUsedMb: toMb(memory.heapUsed),
    heapTotalMb: toMb(memory.heapTotal),
  });
}

function summarizePeakMemory(samples) {
  if (samples.length === 0) return {};
  return {
    rssMb: Math.max(...samples.map((sample) => sample.rssMb)),
    heapUsedMb: Math.max(...samples.map((sample) => sample.heapUsedMb)),
  };
}

function toMb(bytes) {
  return Math.round(bytes / 1024 / 1024);
}

function toMetricNumber(value) {
  return value === undefined ? null : Number(value);
}

function summarizePhaseDurations(spans) {
  const phases = {
    discovery: ["content.discovery"],
    scan: ["content.scan"],
    read: ["content.read"],
    fingerprint: ["content.fingerprint"],
    index: ["content.index"],
    locations: ["content.locations"],
    processing: ["content.process"],
    markdown: ["content.markdown"],
    manifestEntries: ["content.manifest.entries"],
    graph: ["content.graph"],
    buildStateLoad: ["content.build-state.load"],
    changeSet: ["content.change-set"],
    aliases: ["content.aliases"],
    affected: ["content.affected"],
    persistentCacheLookup: ["persistentContentCache.lookup"],
    persistentCacheValidation: ["persistentContentCache.validation"],
    outputDependencyReuse: ["output.dependencies.reuse"],
    outputDependencyManifest: ["output.dependencies.manifest"],
    outputDependencyPlugin: ["output.dependencies.plugin"],
    outputDependencyResolve: ["output.dependencies.resolve"],
  };
  return Object.fromEntries(
    Object.entries(phases).map(([phase, names]) => [
      phase,
      Math.round(
        spans
          .filter((span) => names.includes(span.name))
          .reduce((total, span) => total + span.durationMs, 0),
      ),
    ]),
  );
}

function summarizePhaseMetrics(spans, events) {
  const metrics = new Map();
  for (const span of spans) {
    const metric = metrics.get(span.name) ?? {
      calls: 0,
      aggregateDurationMs: 0,
      errors: 0,
    };
    metric.calls += 1;
    metric.aggregateDurationMs += span.durationMs;
    if (span.status === "error") metric.errors += 1;
    metrics.set(span.name, metric);
  }
  for (const event of events) {
    if (event.name !== "content.read.bytes") continue;
    const metric = metrics.get("content.read") ?? {
      calls: 0,
      aggregateDurationMs: 0,
      errors: 0,
    };
    metric.bytes = (metric.bytes ?? 0) + Number(event.attributes.bytes ?? 0);
    metrics.set("content.read", metric);
  }
  return Object.fromEntries(
    [...metrics.entries()]
      .map(([name, metric]) => [
        name,
        {
          ...metric,
          aggregateDurationMs: Math.round(metric.aggregateDurationMs),
        },
      ])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function summarizePluginTimings(spans) {
  const timings = new Map();
  for (const span of spans) {
    if (!span.name.startsWith("plugin.")) continue;
    const plugin = String(span.attributes.plugin ?? "unknown");
    const hook = String(
      span.attributes.hook ?? span.name.slice("plugin.".length),
    );
    const key = `${plugin}:${hook}`;
    const timing = timings.get(key) ?? {
      plugin,
      hook,
      calls: 0,
      durationMs: 0,
    };
    timing.calls += 1;
    timing.durationMs += span.durationMs;
    timings.set(key, timing);
  }
  return [...timings.values()]
    .map((timing) => ({ ...timing, durationMs: Math.round(timing.durationMs) }))
    .sort((left, right) => right.durationMs - left.durationMs);
}

function summarize(scenario, samples) {
  const keys = Object.keys(samples[0]).filter(
    (key) => !["scenario", "snapshot", "memorySamples"].includes(key),
  );
  const summary = { scenario, runs: samples.length };
  for (const key of keys) {
    const values = samples.map((sample) => sample[key]);
    if (values.some((value) => value === null || value === undefined)) {
      summary[key] = null;
      continue;
    }
    if (values.every((value) => typeof value === "number")) {
      summary[key] = median(values);
      summary[`${key}Min`] = Math.min(...values);
      summary[`${key}Max`] = Math.max(...values);
      summary[`${key}Variance`] = variance(values);
      continue;
    }
    summary[key] = values.at(-1);
  }
  summary.snapshot = samples.at(-1).snapshot;
  summary.samples = samples.map((sample) => {
    const { snapshot, memorySamples, ...rest } = sample;
    return rest;
  });
  return summary;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function variance(values) {
  const average =
    values.reduce((total, value) => total + value, 0) / values.length;
  return Math.round(
    values.reduce((total, value) => total + (value - average) ** 2, 0) /
      values.length,
  );
}

function environment() {
  return {
    node: process.version,
    platform: process.platform,
    release: os.release(),
    arch: process.arch,
    cpu: os.cpus()[0]?.model ?? "unknown",
    cpuCount: os.cpus().length,
    memoryMb: Math.round(os.totalmem() / 1024 / 1024),
  };
}

function parseArgs(raw) {
  const parsed = {};
  for (let index = 0; index < raw.length; index++) {
    const token = raw[index];
    if (!token.startsWith("--")) continue;
    const [key, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }
    const value = raw[index + 1];
    if (value === undefined || value.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

function listArg(value) {
  if (!value || value === "true") return undefined;
  return value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
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
