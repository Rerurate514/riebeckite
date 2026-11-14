export function toMetricNumber(value) {
  return value === undefined ? null : Number(value);
}

export function summarizePhaseDurations(spans) {
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

export function summarizePhaseMetrics(spans, events) {
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

export function summarizePluginTimings(spans) {
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

export function summarize(scenario, samples) {
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

export function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

export function variance(values) {
  const average =
    values.reduce((total, value) => total + value, 0) / values.length;
  return Math.round(
    values.reduce((total, value) => total + (value - average) ** 2, 0) /
      values.length,
  );
}
