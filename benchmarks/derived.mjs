import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { editFrontmatter, generateVault, profileConfig } from "./lib/vault.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const {
  ContentManager,
  NoopLogger,
  SinkTracer,
  defineConfig,
  defineDerivedView,
  definePlugin,
  resolveConfig,
} = await import(pathToFileURL(path.join(root, "packages/core/index.ts")));
const { FileSystemContentSource } = await import(
  pathToFileURL(path.join(root, "packages/node/index.ts"))
);

const size = Number(process.env.DERIVED_BENCH_SIZE ?? 1000);
const repeats = Number(process.env.DERIVED_BENCH_REPEATS ?? 3);
const profile = "baseline";
const depth = profileConfig(profile).depth;

const titles = defineDerivedView({
  id: "benchmark.titles",
  version: "1",
  compute({ entries }, context) {
    context.track({
      type: "query",
      id: "benchmark-titles",
      properties: ["title"],
    });
    return entries.map((entry) => entry.title);
  },
});

const plugin = definePlugin({
  name: "benchmark-derived",
  derivedViews: [titles],
  async planGeneratedOutputs({ derived, manifest }) {
    const resolved = await derived.resolveWithDependencies(titles, {
      entries: manifest.routableEntries.map((entry) => ({
        title: entry.title,
      })),
    });
    return [
      {
        path: "derived/titles.json",
        content: JSON.stringify(resolved.value),
        derivedDependencies: resolved.dependencies,
        derivedViewIds: resolved.viewIds,
      },
    ];
  },
});

async function measure({ directory, cacheDirectory, derived }) {
  const tracer = new SinkTracer({ onEvent: () => {}, onSpan: () => {} });
  const manager = new ContentManager(
    new FileSystemContentSource(directory),
    [],
    {
      config: resolveConfig(
        defineConfig({
          site: { title: "Derived benchmark" },
          content: {
            directory,
            filters: { publishStrategy: "selective" },
          },
          cache: { enabled: true, directory: cacheDirectory },
          plugins: derived ? [plugin] : [],
        }),
      ),
      observability: { logger: new NoopLogger(), tracer },
    },
  );
  const start = performance.now();
  const manifest = await manager.build({ incremental: true });
  const wallClockMs = performance.now() - start;
  await manager.dispose();
  return {
    wallClockMs,
    outputs: manifest.generatedOutputs.length,
    content: manifest.generatedOutputs[0]?.content,
  };
}

async function run(derived) {
  const directory = await fs.mkdtemp(
    path.join(
      os.tmpdir(),
      `riebeckite-derived-bench-${derived ? "on" : "off"}-`,
    ),
  );
  const cacheDirectory = path.join(directory, ".cache");
  await generateVault(directory, { size, profile, seed: 1234 });
  const rows = { cold: undefined, warm: [], edit: [] };
  try {
    rows.cold = await measure({ directory, cacheDirectory, derived });
    for (let repeat = 0; repeat < repeats; repeat++) {
      rows.warm.push(await measure({ directory, cacheDirectory, derived }));
      await editFrontmatter(directory, depth, 0, (yaml) =>
        yaml.replace(/^title:.*/m, `title: Bench ${repeat}`),
      );
      rows.edit.push(await measure({ directory, cacheDirectory, derived }));
    }
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
  return rows;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

const baseline = await run(false);
const derived = await run(true);
for (const [mode, rows] of [
  ["baseline", baseline],
  ["derived", derived],
]) {
  const report = {
    cold: Math.round(rows.cold.wallClockMs),
    warm: {
      medianMs: Math.round(median(rows.warm.map((row) => row.wallClockMs))),
      minMs: Math.round(Math.min(...rows.warm.map((row) => row.wallClockMs))),
      maxMs: Math.round(Math.max(...rows.warm.map((row) => row.wallClockMs))),
    },
    edit: {
      medianMs: Math.round(median(rows.edit.map((row) => row.wallClockMs))),
      minMs: Math.round(Math.min(...rows.edit.map((row) => row.wallClockMs))),
      maxMs: Math.round(Math.max(...rows.edit.map((row) => row.wallClockMs))),
    },
  };
  console.log(JSON.stringify({ mode, size, repeats, profile, ...report }));
}
const cold = derived.cold.content;
const warm = derived.warm[0].content;
console.log(
  JSON.stringify({
    derivedOutputMatches: cold === warm,
    coldBytes: cold?.length ?? 0,
  }),
);
