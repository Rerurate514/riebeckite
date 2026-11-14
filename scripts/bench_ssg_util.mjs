export async function directoryBytes(directory) {
  const entries = await fs
    .readdir(directory, { withFileTypes: true })
    .catch(() => []);
  let total = 0;
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await directoryBytes(full);
    else if (entry.isFile()) total += (await fs.stat(full)).size;
  }
  return total;
}

export function round1(value) {
  return Math.round(value * 10) / 10;
}

export function summarize(scenario, samples) {
  const values = samples.map((sample) => sample.wallClockMs);
  return {
    scenario,
    runs: samples.length,
    wallClockMs: median(values),
    wallClockMsMin: Math.min(...values),
    wallClockMsMax: Math.max(...values),
    samples,
  };
}

export function median(values) {
  return [...values].sort((left, right) => left - right)[
    Math.floor(values.length / 2)
  ];
}

export function toMb(bytes) {
  return Math.round(bytes / 1024 / 1024);
}

