import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  appRequire,
  appRoot,
  execFileAsync,
  root,
} from "./ci_runner_config.mjs";
import { metricNumber } from "./ci_runner_report.mjs";
import { createBenchmarkContent } from "./lib.mjs";

export async function createSite(siteRoot, preset, count) {
  const { scaffoldRiebeckiteSite } = await import(
    pathToFileURL(
      path.join(root, "packages/create-riebeckite/src/scaffold/index.ts"),
    )
  );
  await scaffoldRiebeckiteSite({
    targetDirectory: siteRoot,
    name: `ci-${preset}-${count}`,
    preset,
    site: {
      title: `CI ${preset}`,
      baseUrl: "https://benchmark.example.test",
    },
  });
  await linkWorkspacePackages(siteRoot);
  await createBenchmarkContent({
    contentDirectory: path.join(siteRoot, "content"),
    count,
    preset,
  });
}

export async function buildWorkspacePackages() {
  await execFileAsync(
    process.execPath,
    [path.join(root, "scripts", "build_packages.mjs")],
    { cwd: root, env: process.env, maxBuffer: 1024 * 1024 * 8 },
  );
}

export async function linkWorkspacePackages(siteRoot) {
  const nodeModulesDirectory = path.join(siteRoot, "node_modules");
  const namespaceDirectory = path.join(siteRoot, "node_modules", "@riebeckite");
  await fs.mkdir(namespaceDirectory, { recursive: true });
  const packageRoots = [
    path.join(root, "packages"),
    path.join(root, "packages", "integrations"),
    path.join(root, "packages", "plugins"),
    path.join(root, "packages", "themes"),
  ];
  const packageDirectories = (
    await Promise.all(
      packageRoots.map(async (packageRoot) =>
        (
          await fs.readdir(packageRoot, { withFileTypes: true })
        )
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(packageRoot, entry.name)),
      ),
    )
  ).flat();
  for (const directory of packageDirectories) {
    const packageJson = await fs
      .readFile(path.join(directory, "package.json"), "utf8")
      .then((source) => JSON.parse(source))
      .catch(() => undefined);
    if (
      typeof packageJson?.name !== "string" ||
      !packageJson.name.startsWith("@riebeckite/")
    )
      continue;
    const destination = path.join(
      namespaceDirectory,
      packageJson.name.slice("@riebeckite/".length),
    );
    await fs.symlink(directory, destination, "junction");
  }
  const runtimeDependencies = await fs.readdir(
    path.join(appRoot, "node_modules"),
    { withFileTypes: true },
  );
  for (const dependency of runtimeDependencies) {
    if (
      (!dependency.isDirectory() && !dependency.isSymbolicLink()) ||
      dependency.name.startsWith(".")
    )
      continue;
    if (dependency.name === "@riebeckite") continue;
    const source = path.join(appRoot, "node_modules", dependency.name);
    if (!dependency.name.startsWith("@")) {
      await fs.symlink(
        await fs.realpath(source),
        path.join(nodeModulesDirectory, dependency.name),
        "junction",
      );
      continue;
    }
    const scopeDirectory = path.join(nodeModulesDirectory, dependency.name);
    await fs.mkdir(scopeDirectory, { recursive: true });
    for (const scopedDependency of await fs.readdir(source, {
      withFileTypes: true,
    })) {
      if (!scopedDependency.isDirectory() && !scopedDependency.isSymbolicLink())
        continue;
      await fs.symlink(
        await fs.realpath(path.join(source, scopedDependency.name)),
        path.join(scopeDirectory, scopedDependency.name),
        "junction",
      );
    }
  }
  await fs.symlink(
    await fs.realpath(
      path.join(
        root,
        "packages",
        "plugins",
        "mermaid",
        "node_modules",
        "puppeteer",
      ),
    ),
    path.join(nodeModulesDirectory, "puppeteer"),
    "junction",
  );
  await linkJunctionIfAbsent(
    path.join(
      root,
      "packages",
      "plugins",
      "excalidraw",
      "node_modules",
      "lz-string",
    ),
    path.join(nodeModulesDirectory, "lz-string"),
  );
}

export async function linkJunctionIfAbsent(source, destination) {
  const resolvedSource = await fs.realpath(source);
  try {
    const existing = await fs.lstat(destination);
    if (!existing.isSymbolicLink())
      throw new Error(
        `Refusing to replace non-link dependency: ${destination}`,
      );
    if ((await fs.realpath(destination)) !== resolvedSource)
      throw new Error(
        `Refusing to replace mismatched dependency link: ${destination}`,
      );
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await fs.symlink(resolvedSource, destination, "junction");
}

export async function invokeBuild(siteRoot, label) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(import.meta.url),
      "--buildOnce",
      JSON.stringify({ siteRoot, label, metricsEnabled: true }),
    ],
    { cwd: root, maxBuffer: 1024 * 1024 * 8 },
  );
  return JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
}

export async function buildOnce({ siteRoot, label }) {
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
  const metricsDirectory = path.join(siteRoot, ".riebeckite", "ci-metrics");
  const metricsPath = path.join(metricsDirectory, `${label}.json`);
  await fs.mkdir(metricsDirectory, { recursive: true });
  const samples = [process.memoryUsage().rss];
  const sampler = setInterval(
    () => samples.push(process.memoryUsage().rss),
    25,
  );
  const started = performance.now();
  process.env.RIEBECKITE_SSG_METRICS_FILE = metricsPath;
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
  const metrics = JSON.parse(await fs.readFile(metricsPath, "utf8"));
  return {
    wallTimeMs: Math.round(performance.now() - started),
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
    manifestHooksReused: metricNumber(metrics, "manifestHooksReused"),
    manifestHookDurationMs: Math.round(
      metricNumber(metrics, "manifestHookDurationMs"),
    ),
    fastPathApplied:
      metricNumber(metrics, "renderedRouteCount") === 0 &&
      !metrics.fullRegenerationRequired,
    fullRegenerationRequired: Boolean(metrics.fullRegenerationRequired),
    spansMs: Object.fromEntries(
      Object.entries(metrics.timingsMs ?? {}).map(([name, duration]) => [
        name,
        Math.round(duration),
      ]),
    ),
    rawMetrics: metrics,
  };
}

export async function optionalAlias(name, packageDirectory) {
  try {
    const resolved = await fs.realpath(packageDirectory);
    return [{ find: new RegExp(`^${name}$`), replacement: resolved }];
  } catch {
    return [];
  }
}
