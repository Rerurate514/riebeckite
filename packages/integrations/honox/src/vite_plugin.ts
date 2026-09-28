import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import type { Plugin } from "vite";
import { writeRiebeckiteAssetEntries } from "./asset_entries.js";
import { riebeckiteClientModule } from "./client_module.js";
import { loadRiebeckiteConfig, resolveHonoxConfig } from "./config_loader.js";
import { createWorkspacePackageAliases } from "./workspace_packages.js";

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

        const config = await loadRiebeckiteConfig({
          workspaceRoot,
          configFile: options.configFile,
        });
        resolvedConfig = resolveHonoxConfig(config, appRoot);
        writeRiebeckiteAssetEntries(resolvedConfig, {
          pluginStyles: path.join(appRoot, "app/.riebeckite/plugin-styles.css"),
          themeStyles: path.join(appRoot, "app/.riebeckite/theme-styles.css"),
        });

        return {
          define: {
            "process.env.RIEBECKITE_APP_ROOT": JSON.stringify(appRoot),
          },
          resolve: {
            alias: createWorkspacePackageAliases(workspaceRoot),
          },
        };
      },
    },
    riebeckiteClientModule(getConfig),
  ];
}
