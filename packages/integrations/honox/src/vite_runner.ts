import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Tracer } from "@riebeckite/core";
import { build, createServer, type Plugin } from "vite";
import { loadRiebeckiteConfig, resolveHonoxConfig } from "./config_loader.js";
import { createClientManifestPlugin } from "./ssg/standalone.js";
import {
  findWorkspaceRoot,
  type HonoxApplicationOptions,
  HonoxApplicationRootError,
  ignoredApplicationRootDirectoryNames,
  type ResolvedHonoxApplication,
  type ResolveHonoxApplicationOptions,
  reportSsgTimings,
  viteConfigFileNames,
  withWorkingDirectory,
} from "./vite_runner_helpers.js";

export async function resolveHonoxApplicationRoot(
  configRoot: string,
  startDirectory?: string,
): Promise<string> {
  const roots = await findViteApplicationRoots(configRoot, startDirectory);
  if (roots.length === 1) return roots[0] as string;
  if (roots.length === 0) {
    throw new HonoxApplicationRootError(
      `Could not find a Vite application under ${configRoot}.`,
    );
  }
  throw new HonoxApplicationRootError(
    `Found multiple Vite applications under ${configRoot}: ${roots.join(", ")}.`,
  );
}

export async function resolveHonoxApplication(
  options: ResolveHonoxApplicationOptions,
): Promise<ResolvedHonoxApplication> {
  const configRoot = path.resolve(options.configRoot);
  const appRoot = options.appRoot
    ? path.resolve(options.appRoot)
    : await resolveHonoxApplicationRoot(configRoot, options.startDirectory);
  const workspaceRoot =
    options.workspaceRoot ?? (await findWorkspaceRoot(configRoot));
  const configFile = path.resolve(
    configRoot,
    options.configFile ?? "riebeckite.config.ts",
  );
  const rawConfig = await loadRiebeckiteConfig({
    configRoot,
    configFile: options.configFile,
    workspaceRoot,
  });
  const config = resolveHonoxConfig(rawConfig, appRoot);

  return {
    config,
    configRoot,
    configFile,
    appRoot,
    contentRoot: config.content.directory,
  };
}

export async function startHonoxDevServer(
  options: HonoxApplicationOptions,
): Promise<void> {
  const root = path.resolve(options.root);
  await withWorkingDirectory(root, async () => {
    const previousBridgeToken = process.env.RIEBECKITE_BRIDGE_TOKEN;
    if (options.bridgeToken) {
      process.env.RIEBECKITE_BRIDGE_TOKEN = options.bridgeToken;
    }
    const server = await (async () => {
      try {
        return await createServer({ root, server: options.server });
      } finally {
        if (previousBridgeToken === undefined) {
          delete process.env.RIEBECKITE_BRIDGE_TOKEN;
        } else {
          process.env.RIEBECKITE_BRIDGE_TOKEN = previousBridgeToken;
        }
      }
    })();
    const restartFiles = new Set(
      options.restartOnChange?.map((file) => path.resolve(file)),
    );
    if (restartFiles.size > 0) {
      server.watcher.add([...restartFiles]);
      server.watcher.on("change", (file) => {
        if (!restartFiles.has(path.resolve(file))) return;
        void (async () => {
          await options.onRestart?.();
          await server.restart();
        })();
      });
    }
    await server.listen(options.server?.port);
    const urls = [
      ...(server.resolvedUrls?.local ?? []),
      ...(server.resolvedUrls?.network ?? []),
    ];
    const shutdown = waitForShutdown(server);
    try {
      server.printUrls();
      await options.onServerReady?.(urls);
    } catch (error) {
      shutdown.dispose();
      if (shutdown.isClosing()) {
        await shutdown.promise;
        return;
      }
      await server.close();
      throw error;
    }
    await shutdown.promise;
  });
}

export async function buildHonoxApplication(
  options: HonoxApplicationOptions,
): Promise<void> {
  const root = path.resolve(options.root);
  await withWorkingDirectory(root, async () => {
    const clientOutputDirectory = path.join(
      root,
      ".riebeckite",
      "build-output-client",
    );
    if (!options.reuseClientBuild) {
      await runTraced(options.tracer, "integration.honox.client_build", () =>
        build({ root, mode: "client" }),
      );
    }
    const stableClientDirectory = path.join(
      root,
      ".riebeckite",
      "client-build",
    );
    await fs.rm(stableClientDirectory, { recursive: true, force: true });
    const sourceManifest = options.reuseClientBuild
      ? path.join(
          path.resolve(options.outputDirectory ?? path.join(root, "dist")),
          ".vite",
          "manifest.json",
        )
      : path.join(clientOutputDirectory, ".vite", "manifest.json");
    try {
      await fs.mkdir(path.join(stableClientDirectory, ".vite"), {
        recursive: true,
      });
      await fs.copyFile(
        sourceManifest,
        path.join(stableClientDirectory, ".vite", "manifest.json"),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await fs.rm(stableClientDirectory, { recursive: true, force: true });
    }
    await runTraced(options.tracer, "integration.honox.server_build", () =>
      buildServerWithMetrics(root, options.tracer, [
        createClientManifestPlugin(root, stableClientDirectory),
      ]),
    );
  });
}

async function buildServerWithMetrics(
  root: string,
  tracer: Tracer | undefined,
  plugins: Plugin[] = [],
): Promise<void> {
  if (!tracer) {
    await build({ root, plugins });
    return;
  }

  const previousMetricsFile = process.env.RIEBECKITE_SSG_METRICS_FILE;
  const metricsDirectory = previousMetricsFile
    ? undefined
    : await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-ssg-metrics-"));
  const metricsFile =
    previousMetricsFile ??
    path.join(metricsDirectory as string, "metrics.json");
  if (!previousMetricsFile)
    process.env.RIEBECKITE_SSG_METRICS_FILE = metricsFile;
  try {
    await build({ root, plugins });
    await reportSsgTimings(tracer, metricsFile);
  } finally {
    if (previousMetricsFile === undefined) {
      delete process.env.RIEBECKITE_SSG_METRICS_FILE;
    }
    if (metricsDirectory)
      await fs.rm(metricsDirectory, { recursive: true, force: true });
  }
}

async function runTraced<T>(
  tracer: Tracer | undefined,
  name: string,
  buildTask: () => Promise<T>,
): Promise<T> {
  return tracer ? await tracer.span(name, {}, buildTask) : await buildTask();
}

function waitForShutdown(server: Awaited<ReturnType<typeof createServer>>) {
  let resolve: () => void = () => {};
  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    void server.close().finally(resolve);
  };
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  return {
    promise,
    isClosing: () => closing,
    dispose: () => {
      process.removeListener("SIGINT", close);
      process.removeListener("SIGTERM", close);
    },
  };
}

async function findViteApplicationRoots(
  root: string,
  startDirectory?: string,
): Promise<string[]> {
  const applicationRoot = startDirectory
    ? await findViteApplicationRootFrom(startDirectory, root)
    : undefined;
  if (applicationRoot) return [applicationRoot];

  const directories = [root];
  const applicationRoots: string[] = [];

  while (directories.length > 0) {
    const directory = directories.pop();
    if (!directory) continue;
    if (await hasViteConfig(directory)) applicationRoots.push(directory);

    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (
        !entry.isDirectory() ||
        ignoredApplicationRootDirectoryNames.has(entry.name)
      ) {
        continue;
      }
      directories.push(path.join(directory, entry.name));
    }
  }

  return applicationRoots;
}

async function findViteApplicationRootFrom(
  startDirectory: string,
  configRoot: string,
): Promise<string | undefined> {
  let directory = path.resolve(startDirectory);
  while (isWithin(configRoot, directory)) {
    if (await hasViteConfig(directory)) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
  return undefined;
}

function isWithin(parent: string, target: string): boolean {
  const relative = path.relative(parent, target);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

async function hasViteConfig(directory: string): Promise<boolean> {
  for (const fileName of viteConfigFileNames) {
    try {
      if ((await fs.stat(path.join(directory, fileName))).isFile()) return true;
    } catch {}
  }
  return false;
}

export type {
  ResolvedHonoxApplication,
  ResolveHonoxApplicationOptions,
} from "./vite_runner_helpers.js";
export {
  canReuseClientBuild,
  HonoxApplicationRootError,
} from "./vite_runner_helpers.js";
