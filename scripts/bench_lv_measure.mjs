import { performance } from "node:perf_hooks";
import {
  ContentManager,
  defineConfig,
  FileSystemContentSource,
  NoopLogger,
  resolveConfig,
  SinkTracer,
} from "./bench_lv_config.mjs";

export async function measure(
  directory,
  cacheDirectory,
  scenario,
  pluginVersion,
) {
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
      provenance: {
        enabled: process.env.RIEBECKITE_BENCH_PROVENANCE !== "off",
      },
      plugins: [benchmarkPlugin(pluginVersion)],
    }),
  );
  const startMemory = process.memoryUsage().rss;
  const start = performance.now();
  const manager = new ContentManager(
    new FileSystemContentSource(directory),
    [],
    {
      config,
      observability: { logger: new NoopLogger(), tracer },
    },
  );
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

export function isMemorySpan(name) {
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

export function isMemoryEvent(name) {
  return name === "build.incremental" || name === "content.process.sample";
}

export function startPeakSampler(samples) {
  const interval = setInterval(() => sampleMemory(samples, "interval"), 250);
  return { stop: () => clearInterval(interval) };
}

export function sampleMemory(samples, label) {
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

export function summarizePeakMemory(samples) {
  if (samples.length === 0) return {};
  return {
    rssMb: Math.max(...samples.map((sample) => sample.rssMb)),
    heapUsedMb: Math.max(...samples.map((sample) => sample.heapUsedMb)),
  };
}

export function toMb(bytes) {
  return Math.round(bytes / 1024 / 1024);
}

export function toMetricNumber(value) {
  return value === undefined ? null : Number(value);
}

export function summarizePhaseDurations(spans) {
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

export function summarizeSamples(scenario, samples) {
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

export function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

export function benchmarkPlugin(version) {
  return {
    name: "benchmark-plugin",
    cacheVersion: version,
    processedContentCache: { version, dependencyMode: "tracked" },
  };
}
