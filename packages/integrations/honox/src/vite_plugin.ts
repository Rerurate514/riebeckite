import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import type { Plugin } from "vite";
import { writeRiebeckiteAssetEntries } from "./asset_entries.js";
import { riebeckiteClientModule } from "./client_module.js";
import { resolveHonoxApplication } from "./vite_runner.js";
import { createWorkspacePackageAliases } from "./workspace_packages.js";

export type RiebeckiteIntegrationOptions = {
  configRoot?: string;
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
        const appRoot = options.appRoot ?? root;
        const application = await resolveHonoxApplication({
          configRoot: options.configRoot ?? appRoot,
          configFile: options.configFile,
          appRoot,
          workspaceRoot: options.workspaceRoot,
        });
        resolvedConfig = application.config;
        writeRiebeckiteAssetEntries(resolvedConfig, {
          pluginStyles: path.join(appRoot, "app/.riebeckite/plugin-styles.css"),
          themeStyles: path.join(appRoot, "app/.riebeckite/theme-styles.css"),
        });

        return {
          define: {
            "process.env.RIEBECKITE_APP_ROOT": JSON.stringify(appRoot),
          },
          resolve: {
            alias: options.workspaceRoot
              ? createWorkspacePackageAliases(options.workspaceRoot)
              : [],
          },
        };
      },
    },
    riebeckiteClientModule(getConfig),
  ];
}
