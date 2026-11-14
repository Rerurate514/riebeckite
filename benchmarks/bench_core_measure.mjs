import { performance } from "node:perf_hooks";
import {
  isMemorySpan,
  sampleMemory,
  startPeakSampler,
  summarizePeakMemory,
} from "./bench_core_memory.mjs";
import {
  summarizePhaseDurations,
  summarizePhaseMetrics,
  summarizePluginTimings,
  toMetricNumber,
} from "./bench_core_metrics.mjs";
export async function measure(input) {
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
      plugins: [benchmarkPlugin(input.pluginVersion), ...(l10n ? [l10n] : [])],
    }),
  );
  if (input.configMutate) config = input.configMutate(config);
  const startMemory = process.memoryUsage().rss;
  const start = performance.now();
  const manager = new ContentManager(
    new FileSystemContentSource(input.directory),
    [],
    {
      config,
      observability: { logger: new NoopLogger(), tracer },
    },
  );
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

export function takeSnapshot(manifest) {
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

export function benchmarkPlugin(version) {
  return {
    name: "benchmark-plugin",
    cacheVersion: version,
    processedContentCache: { version, dependencyMode: "tracked" },
  };
}
