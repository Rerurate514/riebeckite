import fs from "node:fs";
import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { build as buildWithEsbuild } from "esbuild";
import { workspacePackageResolver } from "./workspace_packages.ts";

export type RiebeckiteConfigLoaderOptions = {
  workspaceRoot: string;
  configFile?: string;
};

export async function loadRiebeckiteConfig(
  options: RiebeckiteConfigLoaderOptions,
): Promise<ResolvedRiebeckiteConfig> {
  const configFile = options.configFile ?? "riebeckite.config.ts";
  const outputFile = path.join(
    options.workspaceRoot,
    "node_modules/.vite/riebeckite.config.generated.mjs",
  );
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  await buildWithEsbuild({
    stdin: {
      contents: `
        import rawConfig from ${JSON.stringify(path.join(options.workspaceRoot, configFile))};
        import { resolveConfig } from "@riebeckite/core";
        export default resolveConfig(rawConfig);
      `,
      resolveDir: options.workspaceRoot,
      loader: "ts",
    },
    outfile: outputFile,
    bundle: true,
    platform: "node",
    format: "esm",
    plugins: [workspacePackageResolver(options.workspaceRoot)],
  });

  const module = await import(`${pathToFileUrl(outputFile)}?t=${Date.now()}`);
  return module.default;
}

function pathToFileUrl(filePath: string): string {
  return `file:///${filePath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:")}`;
}
