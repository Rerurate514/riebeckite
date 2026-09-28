import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { build as buildWithEsbuild } from "esbuild";
import { workspacePackageResolver } from "./workspace_packages.js";

export type RiebeckiteConfigLoaderOptions = {
  workspaceRoot: string;
  configFile?: string;
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
          import rawConfig from ${JSON.stringify(path.join(options.workspaceRoot, configFile))};
          import { resolveConfigModule } from "@riebeckite/core";
          export default resolveConfigModule(rawConfig);
        `,
        resolveDir: options.workspaceRoot,
        loader: "ts",
      },
      outfile: outputFile,
      bundle: true,
      platform: "node",
      format: "esm",
      // Bundled dependencies may contain CommonJS `require()` calls (for
      // example `yaml`'s `require("process")`). esbuild rewrites those to its
      // `__require` shim, which throws "Dynamic require of ... is not
      // supported" in ESM output unless a real `require` exists. The banner
      // provides one for the bundled module.
      banner: {
        js: 'import { createRequire as __riebeckiteCreateRequire } from "node:module"; const require = __riebeckiteCreateRequire(import.meta.url);',
      },
      plugins: [workspacePackageResolver(options.workspaceRoot)],
    });

    const module = await import(`${pathToFileUrl(outputFile)}?t=${Date.now()}`);
    return module.default;
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

/** Resolves config paths whose documented base is the HonoX application root. */
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
