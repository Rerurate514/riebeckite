export function isMemorySpan(name) {
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
