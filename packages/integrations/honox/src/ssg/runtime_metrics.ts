import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import type { SsgOutputMetrics } from "./types.js";

export async function measure<T>(
  timingsMs: Record<string, number> | undefined,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!timingsMs) return await fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    if (timingsMs)
      timingsMs[name] = (timingsMs[name] ?? 0) + performance.now() - start;
  }
}

export function measureSync<T>(
  timingsMs: Record<string, number> | undefined,
  name: string,
  fn: () => T,
): T {
  if (!timingsMs) return fn();
  const start = performance.now();
  try {
    return fn();
  } finally {
    if (timingsMs)
      timingsMs[name] = (timingsMs[name] ?? 0) + performance.now() - start;
  }
}

export async function writeSsgOutputMetrics(
  metrics: SsgOutputMetrics,
): Promise<void> {
  const file = process.env.RIEBECKITE_SSG_METRICS_FILE;
  if (!file) return;
  await writeFile(file, `${JSON.stringify(metrics)}\n`, "utf8");
}
