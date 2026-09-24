import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import type { Plugin } from "vite";
import { writeRiebeckiteAssetEntries } from "./asset_entries.ts";
import { riebeckiteClientModule } from "./client_module.ts";
import { loadRiebeckiteConfig } from "./config_loader.ts";
import { createWorkspacePackageAliases } from "./workspace_packages.ts";

export type RiebeckiteIntegrationOptions = {
  workspaceRoot?: string;
  appRoot?: string;
  configFile?: string;
};

export function riebeckite(
  options: RiebeckiteIntegrationOptions = {},
): Plugin[] {
  let resolvedConfig: ResolvedRiebeckiteConfig | undefined;
  const getConfig = () => {
    if (!resolvedConfig) {
      throw new Error("Riebeckite config has not been loaded yet.");
    }
    return resolvedConfig;
  };

  return [
    {
      name: "riebeckite-host-integration",
      async config(userConfig) {
        const root = userConfig.root
          ? path.resolve(userConfig.root)
          : process.cwd();
        const workspaceRoot =
          options.workspaceRoot ?? path.resolve(root, "../..");
        const appRoot = options.appRoot ?? root;

        resolvedConfig = await loadRiebeckiteConfig({
          workspaceRoot,
          configFile: options.configFile,
        });
        writeRiebeckiteAssetEntries(resolvedConfig, {
          pluginStyles: path.join(appRoot, "app/.riebeckite/plugin-styles.css"),
          themeStyles: path.join(appRoot, "app/.riebeckite/theme-styles.css"),
        });

        return {
          resolve: {
            alias: createWorkspacePackageAliases(workspaceRoot),
          },
        };
      },
    },
    riebeckiteClientModule(getConfig),
  ];
}
