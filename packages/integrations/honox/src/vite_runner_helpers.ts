import fs from "node:fs/promises";
import path from "node:path";
import type { ResolvedRiebeckiteConfig, Tracer } from "@riebeckite/core";
import type { RiebeckiteConfigLoaderOptions } from "./config_loader.js";
import { verifyClientBuildArtifacts } from "./ssg/build_output.js";
import { computeBundleFingerprint } from "./ssg/inventory.js";
import { loadOutputCacheMetadata } from "./ssg/output_cache.js";

export type HonoxApplicationOptions = {
  root: string;
  tracer?: Tracer;
  server?: {
    host?: string;
    open?: boolean;
    port?: number;
  };
  onServerReady?: (urls: readonly string[]) => void | Promise<void>;
  onRestart?: () => void | Promise<void>;
  restartOnChange?: readonly string[];
  reuseClientBuild?: boolean;
  bridgeToken?: string;
  outputDirectory?: string;
};

export type ResolvedHonoxApplication = {
  config: ResolvedRiebeckiteConfig;
  configRoot: string;
  configFile: string;
  appRoot: string;
  contentRoot: string;
};

export type ResolveHonoxApplicationOptions = RiebeckiteConfigLoaderOptions & {
  appRoot?: string;
  startDirectory?: string;
};

export const viteConfigFileNames = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
] as const;

export const ignoredApplicationRootDirectoryNames = new Set([
  ".git",
  ".riebeckite",
  "node_modules",
  "test",
  "tests",
  "templates",
]);

export class HonoxApplicationRootError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HonoxApplicationRootError";
  }
}

export async function findWorkspaceRoot(
  configRoot: string,
): Promise<string | undefined> {
  try {
    const workspaceConfig = await fs.readFile(
      path.join(configRoot, "pnpm-workspace.yaml"),
      "utf8",
    );
    return /^packages\s*:/m.test(workspaceConfig) ? configRoot : undefined;
  } catch {
    return undefined;
  }
}

export async function canReuseClientBuild(input: {
  readonly root: string;
  readonly outputDirectory: string;
}): Promise<boolean> {
  const root = path.resolve(input.root);
  const cache = await loadOutputCacheMetadata(
    path.join(root, ".riebeckite", "ssg-output-cache.json"),
  );
  if (!cache?.bundleFingerprint || !cache.configFile) return false;
  if (
    cache.bundleFingerprint !==
    (await computeBundleFingerprint(root, cache.configFile))
  ) {
    return false;
  }
  return await verifyClientBuildArtifacts({
    outDir: input.outputDirectory,
    expectedInventory: cache.finalOutputInventory ?? {},
  });
}

export async function reportSsgTimings(tracer: Tracer, metricsFile: string) {
  try {
    const metrics: unknown = JSON.parse(await fs.readFile(metricsFile, "utf8"));
    if (!metrics || typeof metrics !== "object") return;
    const timings = (metrics as { timingsMs?: unknown }).timingsMs;
    if (!timings || typeof timings !== "object") return;
    for (const [name, durationMs] of Object.entries(timings)) {
      if (typeof durationMs !== "number" || !Number.isFinite(durationMs))
        continue;
      tracer.event("integration.timing", {
        name: `integration.honox.server_build.ssg.${name}`,
        durationMs,
      });
    }
  } catch {}
}

export async function withWorkingDirectory<T>(
  root: string,
  task: () => Promise<T>,
): Promise<T> {
  const previousDirectory = process.cwd();
  if (previousDirectory === root) return await task();
  process.chdir(root);
  try {
    return await task();
  } finally {
    process.chdir(previousDirectory);
  }
}
