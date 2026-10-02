import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ContentManager, NoopLogger, SinkTracer, defineConfig, resolveConfig } =
  await import(pathToFileURL(path.join(root, "packages/core/index.ts")));

const sizes = parseList(
  process.env.RIEBECKITE_BENCH_SIZES ?? "100,1000,10000",
).map(Number);
const scenarioFilter = new Set(
  parseList(process.env.RIEBECKITE_BENCH_SCENARIOS ?? ""),
);
const repeatCount = Number(process.env.RIEBECKITE_BENCH_REPEATS ?? "3");
const baseDir = path.join(os.tmpdir(), "riebeckite-large-vault-benchmark");

for (const size of sizes) {
  const samplesByScenario = new Map();
  for (let runIndex = 0; runIndex < repeatCount; runIndex++) {
    const directory = path.join(
      baseDir,
      String(size),
      String(runIndex),
      "vault",
    );
    const cacheDirectory = path.join(
      baseDir,
      String(size),
      String(runIndex),
      "cache",
    );
    for (const scenario of createScenarios(directory, size)) {
      if (scenarioFilter.size > 0 && !scenarioFilter.has(scenario.name))
        continue;
      await fs.rm(path.join(baseDir, String(size), String(runIndex)), {
        recursive: true,
        force: true,
      });
      await generateVault(directory, size);
      if (scenario.warm !== false) {
        await measure(
          directory,
          cacheDirectory,
          `${scenario.name} baseline`,
          scenario.pluginVersion ?? "v1",
        );
      }
      await scenario.prepare();
      const sample = await measure(
        directory,
        cacheDirectory,
        scenario.name,
        scenario.pluginVersion ?? "v1",
      );
      const samples = samplesByScenario.get(scenario.name) ?? [];
      samples.push(sample);
      samplesByScenario.set(scenario.name, samples);
    }
  }

  const rows = [];
  for (const [scenario, samples] of samplesByScenario) {
    const row = summarizeSamples(scenario, samples);
    rows.push({ size, ...row });
    console.log(JSON.stringify({ size, ...row }));
  }

  console.log(JSON.stringify(rows, null, 2));
}

function createScenarios(directory, size) {
  return [
    { name: "cold build", prepare: async () => undefined, warm: false },
    { name: "no-change warm build", prepare: async () => undefined },
    {
      name: "single independent note edit",
      prepare: () =>
        append(directory, notePath(size - 1), "\nIndependent edit.\n"),
    },
    {
      name: "highly-linked note edit",
      prepare: () => append(directory, notePath(0), "\nHub edit.\n"),
    },
    {
      name: "embedded note edit",
      prepare: () => append(directory, notePath(5), "\nEmbed edit.\n"),
    },
    {
      name: "referenced local asset edit",
      prepare: () =>
        fs.writeFile(
          path.join(directory, "assets", "asset-0.png"),
          Buffer.from(`asset changed ${size}`),
        ),
    },
    {
      name: "new note",
      prepare: () => writeNote(directory, size, { extra: "New note." }),
    },
    {
      name: "deleted note",
      prepare: () =>
        fs.rm(path.join(directory, notePath(size - 2)), { force: true }),
    },
    {
      name: "rename move",
      prepare: () => renameMove(directory, Math.max(1, size - 3)),
    },
    {
      name: "plugin config change",
      prepare: async () => undefined,
      pluginVersion: "v2",
    },
  ];
}

function parseList(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function measure(directory, cacheDirectory, scenario, pluginVersion) {
  const events = [];
  const spans = [];
  const memorySamples = [];
  sampleMemory(memorySamples, "before manager");
  const tracer = new SinkTracer({
    onEvent: (event) => {
      events.push(event);
      if (isMemoryEvent(event.name)) sampleMemory(memorySamples, event.name);
    },
    onSpan: (span) => {
      spans.push(span);
      if (isMemorySpan(span.name))
        sampleMemory(memorySamples, `after ${span.name}`);
    },
  });
  const config = resolveConfig(
    defineConfig({
      site: { title: "Benchmark" },
      content: { directory, filters: { publishStrategy: "selective" } },
      cache: { enabled: true, directory: cacheDirectory },
      plugins: [benchmarkPlugin(pluginVersion)],
    }),
  );
  const startMemory = process.memoryUsage().rss;
  const start = performance.now();
  const manager = new ContentManager(directory, [], {
    config,
    observability: { logger: new NoopLogger(), tracer },
  });
  sampleMemory(memorySamples, "after manager");
  const peak = startPeakSampler(memorySamples);
  const manifest = await manager.build({ incremental: true });
  sampleMemory(memorySamples, "after build");
  if (globalThis.gc) {
    globalThis.gc();
    sampleMemory(memorySamples, "after build gc");
  }
  await manager.dispose();
  sampleMemory(memorySamples, "after dispose");
  if (globalThis.gc) {
    globalThis.gc();
    sampleMemory(memorySamples, "after dispose gc");
  }
  peak.stop();
  const wallClockMs = performance.now() - start;
  const endMemory = process.memoryUsage().rss;
  const peakMemory = summarizePeakMemory(memorySamples);
  const outputMetrics = events.find(
    (event) => event.name === "build.incremental.outputs",
  )?.attributes;
  return {
    scenario,
    wallClockMs: Math.round(wallClockMs),
    processedContentCount: spans.filter(
      (span) => span.name === "content.process",
    ).length,
    reusedContentCount: events.filter((event) => event.name === "content.reuse")
      .length,
    cacheHits: events.filter(
      (event) => event.name === "persistentContentCache.hit",
    ).length,
    cacheMisses: events.filter(
      (event) => event.name === "persistentContentCache.miss",
    ).length,
    invalidatedContentCount: Number(
      events.find((event) => event.name === "build.incremental")?.attributes
        ?.affected ?? manifest.entries.length,
    ),
    candidateOutputCount:
      toMetricNumber(outputMetrics?.candidateOutputCount) ??
      manifest.publicEntries.length +
        manifest.pagePaths.length +
        manifest.generatedOutputs.length,
    affectedOutputCount: toMetricNumber(outputMetrics?.affectedOutputCount),
    removedOutputCount: toMetricNumber(outputMetrics?.removedOutputCount),
    unchangedOutputCount: toMetricNumber(outputMetrics?.unchangedOutputCount),
    fullOutputRegenerationRequired:
      outputMetrics?.fullRegenerationRequired ?? null,
    renderedOutputCount: null,
    writtenOutputCount: null,
    skippedOutputCount: null,
    deletedOutputCount: null,
    peakRssMb:
      peakMemory.rssMb ??
      Math.round(Math.max(startMemory, endMemory) / 1024 / 1024),
    peakHeapUsedMb: peakMemory.heapUsedMb,
    finalHeapUsedMb: toMb(process.memoryUsage().heapUsed),
    entries: manifest.entries.length,
    phaseDurationsMs: summarizePhaseDurations(spans),
    memorySamples,
  };
}

function isMemorySpan(name) {
  return [
    "content.discovery",
    "content.fingerprint",
    "content.index",
    "content.locations",
    "content.manifest.entries",
    "content.graph",
    "content.manifest",
  ].includes(name);
}

function isMemoryEvent(name) {
  return name === "build.incremental" || name === "content.process.sample";
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
    externalMb: toMb(memory.external),
    arrayBuffersMb: toMb(memory.arrayBuffers),
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
    fingerprint: ["content.fingerprint"],
    index: ["content.index"],
    location: ["content.locations"],
    processing: ["content.process"],
    manifest: ["content.manifest.entries"],
    graphBacklinkTaxonomy: ["content.graph"],
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

function summarizeSamples(scenario, samples) {
  const keys = Object.keys(samples[0]).filter((key) => key !== "scenario");
  const summary = { scenario, runs: samples.length };
  for (const key of keys) {
    const values = samples.map((sample) => sample[key]);
    if (values.some((value) => value === null)) {
      summary[key] = null;
      continue;
    }
    if (values.every((value) => typeof value === "number")) {
      summary[key] = median(values);
      summary[`${key}Min`] = Math.min(...values);
      summary[`${key}Max`] = Math.max(...values);
      continue;
    }
    summary[key] = values.at(-1);
  }
  summary.samples = samples;
  return summary;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function benchmarkPlugin(version) {
  return {
    name: "benchmark-plugin",
    cacheVersion: version,
    processedContentCache: { version, dependencyMode: "tracked" },
  };
}

async function generateVault(directory, size) {
  await fs.mkdir(path.join(directory, "assets"), { recursive: true });
  for (let index = 0; index < Math.max(1, Math.ceil(size / 100)); index++) {
    await fs.writeFile(
      path.join(directory, "assets", `asset-${index}.png`),
      Buffer.from(`asset ${index}`),
    );
  }
  for (let index = 0; index < size; index++) {
    await writeNote(directory, index);
  }
}

async function writeNote(directory, index, options = {}) {
  const file = path.join(directory, notePath(index));
  await fs.mkdir(path.dirname(file), { recursive: true });
  const links = [];
  if (index > 0 && index % 3 === 0) links.push(`[[${slugPath(index - 1)}]]`);
  if (index > 10 && index % 10 === 0) links.push(`[[${slugPath(0)}]]`);
  if (index > 5 && index % 25 === 0) links.push(`![[${slugPath(5)}]]`);
  if (index % 20 === 0)
    links.push(
      `![asset](../assets/asset-${index % Math.max(1, Math.ceil((index + 1) / 100))}.png)`,
    );
  const tags = [`tag${index % 20}`, `group${index % 7}`];
  const alias = `Alias ${index}`;
  const markdown = [
    "---",
    `title: Note ${index}`,
    "visibility: public",
    `aliases: ["${alias}"]`,
    `tags: [${tags.map((tag) => `"${tag}"`).join(", ")}]`,
    "---",
    "",
    `# Note ${index}`,
    "",
    `This is deterministic content for note ${index}.`,
    ...links,
    "",
    `#${tags[0]} #${tags[1]}`,
    options.extra ?? "",
  ].join("\n");
  await fs.writeFile(file, markdown, "utf8");
}

function notePath(index) {
  return `${slugPath(index)}.md`;
}

function slugPath(index) {
  const section = String(Math.floor(index / 100)).padStart(3, "0");
  return `notes/section-${section}/note-${String(index).padStart(5, "0")}`;
}

async function append(directory, relativePath, text) {
  await fs.appendFile(path.join(directory, relativePath), text, "utf8");
}

async function renameMove(directory, index) {
  const from = path.join(directory, notePath(index));
  const to = path.join(
    directory,
    "moved",
    `note-${String(index).padStart(5, "0")}.md`,
  );
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}
