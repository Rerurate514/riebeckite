import fs from "node:fs/promises";
import path from "node:path";
import type { ResolvedRiebeckiteConfig, Tracer } from "@riebeckite/core";
import { build, createServer } from "vite";
import {
  loadRiebeckiteConfig,
  resolveHonoxConfig,
  type RiebeckiteConfigLoaderOptions,
} from "./config_loader.js";

export type HonoxApplicationOptions = {
  root: string;
  tracer?: Tracer;
};

export type ResolvedHonoxApplication = {
  config: ResolvedRiebeckiteConfig;
  configRoot: string;
  appRoot: string;
  contentRoot: string;
};

export type ResolveHonoxApplicationOptions = RiebeckiteConfigLoaderOptions & {
  /** Overrides automatic Vite application discovery when supplied. */
  appRoot?: string;
};

const viteConfigFileNames = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
] as const;

export async function resolveHonoxApplicationRoot(
  configRoot: string,
): Promise<string> {
  const roots = await findViteApplicationRoots(configRoot);
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

export class HonoxApplicationRootError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HonoxApplicationRootError";
  }
}

/**
 * Resolves all filesystem roots used by a Riebeckite application in one place.
 * Config imports are based on configRoot; content paths are based on appRoot.
 */
export async function resolveHonoxApplication(
  options: ResolveHonoxApplicationOptions,
): Promise<ResolvedHonoxApplication> {
  const configRoot = path.resolve(options.configRoot);
  const appRoot = options.appRoot
    ? path.resolve(options.appRoot)
    : await resolveHonoxApplicationRoot(configRoot);
  const workspaceRoot =
    options.workspaceRoot ?? (await findWorkspaceRoot(configRoot));
  const rawConfig = await loadRiebeckiteConfig({
    configRoot,
    configFile: options.configFile,
    workspaceRoot,
  });
  const config = resolveHonoxConfig(rawConfig, appRoot);

  return {
    config,
    configRoot,
    appRoot,
    contentRoot: config.content.directory,
  };
}

async function findWorkspaceRoot(
  configRoot: string,
): Promise<string | undefined> {
  try {
    const workspaceConfig = path.join(configRoot, "pnpm-workspace.yaml");
    return (await fs.stat(workspaceConfig)).isFile() ? configRoot : undefined;
  } catch {
    return undefined;
  }
}

export async function startHonoxDevServer(
  options: HonoxApplicationOptions,
): Promise<void> {
  const server = await createServer({ root: options.root });
  await server.listen();
  server.printUrls();
  await waitForShutdown(server);
}

export async function buildHonoxApplication(
  options: HonoxApplicationOptions,
): Promise<void> {
  await runTraced(options.tracer, "integration.honox.client_build", () =>
    build({ root: options.root, mode: "client" }),
  );
  await runTraced(options.tracer, "integration.honox.server_build", () =>
    build({ root: options.root }),
  );
}

async function runTraced<T>(
  tracer: Tracer | undefined,
  name: string,
  buildTask: () => Promise<T>,
): Promise<T> {
  return tracer ? await tracer.span(name, {}, buildTask) : await buildTask();
}

async function waitForShutdown(
  server: Awaited<ReturnType<typeof createServer>>,
) {
  await new Promise<void>((resolve) => {
    const close = () => {
      void server.close().finally(resolve);
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });
}

async function findViteApplicationRoots(root: string): Promise<string[]> {
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
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "tests"
      ) {
        continue;
      }
      directories.push(path.join(directory, entry.name));
    }
  }

  return applicationRoots;
}

async function hasViteConfig(directory: string): Promise<boolean> {
  for (const fileName of viteConfigFileNames) {
    try {
      if ((await fs.stat(path.join(directory, fileName))).isFile()) return true;
    } catch {
      // Continue checking the supported Vite config filenames.
    }
  }
  return false;
}
