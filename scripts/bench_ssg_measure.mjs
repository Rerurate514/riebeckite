import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { gzipSync } from "node:zlib";
import {
  build,
  contentStatePaths,
  defineConfig,
  entryScript,
  execFileAsync,
  honox,
  riebeckiteVite,
  root,
  viteBuild,
} from "./bench_ssg_shared.mjs";
import { directoryBytes, round1, toMb } from "./bench_ssg_util.mjs";

export async function measure(siteRoot, scenario) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [entryScript],
    {
      env: {
        ...process.env,
        RIEBECKITE_BENCH_BUILD_ONCE: JSON.stringify({ siteRoot, scenario }),
      },
      maxBuffer: 1024 * 1024 * 32,
    },
  );
  return JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
}

export async function runBuild(siteRoot, scenario) {
  const metricsFile = path.join(
    siteRoot,
    ".riebeckite",
    `${scenario}.ssg.json`,
  );
  const traceFile = path.join(
    siteRoot,
    ".riebeckite",
    `${scenario}.trace.jsonl`,
  );
  process.env.RIEBECKITE_SSG_METRICS_FILE = metricsFile;
  process.env.RIEBECKITE_BENCH_TRACE_FILE = traceFile;
  process.env.RIEBECKITE_APP_ROOT = siteRoot;
  const memorySamples = [];
  const sampler = setInterval(
    () => memorySamples.push(process.memoryUsage()),
    100,
  );
  const start = performance.now();
  await build(
    defineConfig({
      root: siteRoot,
      resolve: {
        alias: {
          "@riebeckite/honox/server": path.join(
            root,
            "packages",
            "integrations",
            "honox",
            "dist",
            "server.js",
          ),
          "@riebeckite/honox": path.join(
            root,
            "packages",
            "integrations",
            "honox",
            "dist",
            "index.js",
          ),
          "@riebeckite/core": path.join(
            root,
            "packages",
            "core",
            "dist",
            "index.js",
          ),
        },
      },
      plugins: [
        honox({ client: { input: ["/app/client.ts"] } }),
        ...riebeckiteVite(),
        viteBuild(),
      ],
      logLevel: "silent",
    }),
  );
  clearInterval(sampler);
  memorySamples.push(process.memoryUsage());
  const wallClockMs = Math.round(performance.now() - start);
  const ssgMetrics = JSON.parse(await fs.readFile(metricsFile, "utf8"));
  const traceMetrics = await readTraceMetrics(traceFile);
  const persistentState = await measurePersistentState(siteRoot);
  return {
    scenario,
    wallClockMs,
    peakRssMb: toMb(Math.max(...memorySamples.map((sample) => sample.rss))),
    peakHeapUsedMb: toMb(
      Math.max(...memorySamples.map((sample) => sample.heapUsed)),
    ),
    ...ssgMetrics,
    ...traceMetrics,
    ...persistentState,
  };
}

async function measurePersistentState(siteRoot) {
  const entries = [
    ["contentState", contentStatePaths(siteRoot)],
    [
      "outputCache",
      [path.join(siteRoot, ".riebeckite", "ssg-output-cache.json")],
    ],
  ];
  const result = {};
  for (const [name, candidates] of entries) {
    let bytes = null;
    for (const candidate of candidates) {
      try {
        const content = await fs.readFile(candidate);
        bytes = content.length;
        const start = performance.now();
        const compressed = gzipSync(content);
        result[`${name}CompressionMs`] = round1(performance.now() - start);
        result[`${name}GzipBytes`] = compressed.length;
        break;
      } catch (error) {
        if (error && error.code === "ENOENT") continue;
        throw error;
      }
    }
    result[`${name}Bytes`] = bytes;
  }
  result.cacheDirectoryBytes = await directoryBytes(
    path.join(siteRoot, ".riebeckite", "cache"),
  );
  return result;
}


async function readTraceMetrics(traceFile) {
  let raw;
  try {
    raw = await fs.readFile(traceFile, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return {};
    throw error;
  }
  const executionCounts = {};
  const coreTimingsMs = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line) continue;
    const record = JSON.parse(line);
    executionCounts[record.name] = (executionCounts[record.name] ?? 0) + 1;
    if (record.type === "span") {
      coreTimingsMs[record.name] =
        (coreTimingsMs[record.name] ?? 0) + record.durationMs;
    }
  }
  return {
    executionCounts,
    coreTimingsMs: Object.fromEntries(
      Object.entries(coreTimingsMs).map(([name, duration]) => [
        name,
        Math.round(duration),
      ]),
    ),
  };
}
