import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ContentManager, NoopLogger, SinkTracer, defineConfig, resolveConfig } =
  await import(pathToFileURL(path.join(root, "packages/core/index.ts")));
const { FileSystemContentSource } = await import(
  pathToFileURL(path.join(root, "packages/node/index.ts"))
);

const _sizes = parseList(
  process.env.RIEBECKITE_BENCH_SIZES ?? "100,1000,10000",
).map(Number);
const _scenarioFilter = new Set(
  parseList(process.env.RIEBECKITE_BENCH_SCENARIOS ?? ""),
);
const _repeatCount = Number(process.env.RIEBECKITE_BENCH_REPEATS ?? "3");
const _baseDir = path.join(os.tmpdir(), "riebeckite-large-vault-benchmark");

export function parseList(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export {
  ContentManager,
  defineConfig,
  FileSystemContentSource,
  NoopLogger,
  resolveConfig,
  SinkTracer,
};
