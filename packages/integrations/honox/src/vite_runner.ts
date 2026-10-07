import fs from "node:fs/promises";
import path from "node:path";
import type { ResolvedRiebeckiteConfig, Tracer } from "@riebeckite/core";
import { build, createServer } from "vite";
import {
  loadRiebeckiteConfig,
  type RiebeckiteConfigLoaderOptions,
  resolveHonoxConfig,
} from "./config_loader.js";

export type HonoxApplicationOptions = {
  root: string;
  tracer?: Tracer;
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

const viteConfigFileNames = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
] as const;

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

export class HonoxApplicationRootError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HonoxApplicationRootError";
  }
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
  const root = path.resolve(options.root);
  await withWorkingDirectory(root, async () => {
    const server = await createServer({ root });
    await server.listen();
    server.printUrls();
    await waitForShutdown(server);
  });
}

export async function buildHonoxApplication(
  options: HonoxApplicationOptions,
): Promise<void> {
  const root = path.resolve(options.root);
  await withWorkingDirectory(root, async () => {
    await runTraced(options.tracer, "integration.honox.client_build", () =>
      build({ root, mode: "client" }),
    );
    await runTraced(options.tracer, "integration.honox.server_build", () =>
      build({ root }),
    );
  });
}

async function withWorkingDirectory<T>(
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
