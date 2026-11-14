import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { appRequire, appRoot, root } from "./runner_config.mjs";
import { metricNumber } from "./runner_report.mjs";
import { optionalAlias } from "./runner_site.mjs";

export async function buildOnce({ siteRoot, label, metricsEnabled = true }) {
  const processStartupElapsedMs = Math.round(performance.now());
  const processUsageBefore = process.resourceUsage();
  const { build, defineConfig } = await import(
    pathToFileURL(appRequire.resolve("vite")).href
  );
  const { default: honox } = await import(
    pathToFileURL(appRequire.resolve("honox/vite")).href
  );
  const { default: viteBuild } = await import(
    pathToFileURL(
      path.join(
        appRoot,
        "node_modules/@hono/vite-build/dist/adapter/node/index.mjs",
      ),
    ).href
  );
  const { riebeckiteVite } = await import(
    pathToFileURL(path.join(root, "packages/integrations/honox/index.ts")).href
  );
  const metricsDirectory = path.join(siteRoot, ".riebeckite", "benchmark");
  const metricsPath = path.join(metricsDirectory, `${label}.json`);
  if (metricsEnabled) await fs.mkdir(metricsDirectory, { recursive: true });
  const samples = [process.memoryUsage().rss];
  const sampler = setInterval(
    () => samples.push(process.memoryUsage().rss),
    25,
  );
  const started = performance.now();
  if (metricsEnabled) process.env.RIEBECKITE_SSG_METRICS_FILE = metricsPath;
  try {
    await build(
      defineConfig({
        root: siteRoot,
        configFile: false,
        resolve: {
          alias: [
            {
              find: /^@riebeckite\/core$/,
              replacement: path.join(root, "packages/core/index.ts"),
            },
            {
              find: /^@riebeckite\/honox\/server$/,
              replacement: path.join(
                root,
                "packages/integrations/honox/dist/server.js",
              ),
            },
            {
              find: /^@riebeckite\/honox$/,
              replacement: path.join(
                root,
                "packages/integrations/honox/index.ts",
              ),
            },
            ...(await optionalAlias(
              "puppeteer",
              path.join(
                root,
                "packages/plugins/mermaid/node_modules/puppeteer",
              ),
            )),
            ...(await optionalAlias(
              "lz-string",
              path.join(
                root,
                "packages/plugins/excalidraw/node_modules/lz-string",
              ),
            )),
            ...(await optionalAlias(
              "@marp-team/marp-core",
              path.join(
                root,
                "packages/plugins/marp/node_modules/@marp-team/marp-core",
              ),
            )),
          ],
        },
        plugins: [
          honox({ client: { input: ["/app/client.ts"] } }),
          ...riebeckiteVite(),
          viteBuild(),
        ],
        logLevel: "silent",
      }),
    );
  } finally {
    clearInterval(sampler);
    delete process.env.RIEBECKITE_SSG_METRICS_FILE;
  }
  samples.push(process.memoryUsage().rss);
  const processUsageAfter = process.resourceUsage();
  const metrics = metricsEnabled
    ? JSON.parse(await fs.readFile(metricsPath, "utf8"))
    : {};
  return {
    wallTimeMs: Math.round(performance.now() - started),
    processStartupElapsedMs,
    cpuUserTimeMs: Math.round(
      (processUsageAfter.userCPUTime - processUsageBefore.userCPUTime) / 1_000,
    ),
    cpuSystemTimeMs: Math.round(
      (processUsageAfter.systemCPUTime - processUsageBefore.systemCPUTime) /
        1_000,
    ),
    filesystemReadCalls: processUsageAfter.fsRead - processUsageBefore.fsRead,
    filesystemWriteCalls:
      processUsageAfter.fsWrite - processUsageBefore.fsWrite,
    peakRssMb: Math.round(Math.max(...samples) / 1024 / 1024),
    contentProcessed: metricNumber(metrics, "processedContentCount"),
    contentReused: metricNumber(metrics, "reusedContentCount"),
    outputRendered: metricNumber(metrics, "renderedOutputCount"),
    outputReused: metricNumber(metrics, "reusedOutputCount"),
    ssrRouteCount: metricNumber(metrics, "renderedRouteCount"),
    outputCacheHit: metricNumber(metrics, "cacheEntriesRead"),
    outputCacheMiss: Math.max(
      0,
      metricNumber(metrics, "candidateOutputCount") -
        metricNumber(metrics, "cacheEntriesRead"),
    ),
    manifestHooksExecuted: metricNumber(metrics, "manifestHooksExecuted"),
    manifestHooksReused: metricNumber(metrics, "manifestHooksReused"),
    manifestHookCacheHit: metricNumber(metrics, "manifestHookCacheHit"),
    manifestHookCacheMiss: metricNumber(metrics, "manifestHookCacheMiss"),
    manifestHookDurationMs: Math.round(
      metricNumber(metrics, "manifestHookDurationMs"),
    ),
    fastPathApplied:
      metricNumber(metrics, "renderedRouteCount") === 0 &&
      !metrics.fullRegenerationRequired,
    fullRegenerationRequired: Boolean(metrics.fullRegenerationRequired),
    globalOrUnknownDependency: Boolean(metrics.fullRegenerationRequired),
    outputWriteTimeMs: Math.round(metrics.timingsMs?.outputWrite ?? 0),
    metricsCollected: metricsEnabled,
    spansMs: Object.fromEntries(
      Object.entries(metrics.timingsMs ?? {}).map(([name, duration]) => [
        name,
        Math.round(duration),
      ]),
    ),
    rawMetrics: metrics,
  };
}
