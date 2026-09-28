import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { build as buildWithEsbuild } from "esbuild";
import { workspacePackageResolver } from "./workspace_packages.js";

export type RiebeckiteConfigLoaderOptions = {
  configRoot: string;
  configFile?: string;
  workspaceRoot?: string;
};

export async function loadRiebeckiteConfig(
  options: RiebeckiteConfigLoaderOptions,
): Promise<ResolvedRiebeckiteConfig> {
  const configFile = options.configFile ?? "riebeckite.config.ts";
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-config-"),
  );
  const outputFile = path.join(temporaryDirectory, "config.mjs");

  try {
    await buildWithEsbuild({
      stdin: {
        contents: `
          import rawConfig from ${JSON.stringify(path.resolve(options.configRoot, configFile))};
          import { resolveConfigModule } from "@riebeckite/core";
          export default resolveConfigModule(rawConfig);
        `,
        resolveDir: options.configRoot,
        loader: "ts",
      },
      outfile: outputFile,
      bundle: true,
      platform: "node",
      format: "esm",
      banner: {
        js: 'import { createRequire as __riebeckiteCreateRequire } from "node:module"; const require = __riebeckiteCreateRequire(import.meta.url);',
      },
      plugins: options.workspaceRoot
        ? [workspacePackageResolver(options.workspaceRoot)]
        : [],
    });

    const module = await import(`${pathToFileUrl(outputFile)}?t=${Date.now()}`);
    return module.default;
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export function resolveHonoxConfig(
  config: ResolvedRiebeckiteConfig,
  appRoot: string,
): ResolvedRiebeckiteConfig {
  return {
    ...config,
    content: {
      ...config.content,
      directory: path.resolve(appRoot, config.content.directory),
    },
  };
}

function pathToFileUrl(filePath: string): string {
  return `file:///${filePath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:")}`;
}
