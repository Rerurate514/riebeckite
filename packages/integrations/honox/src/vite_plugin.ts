import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import type { Plugin } from "vite";
import { writeRiebeckiteAssetEntries } from "./asset_entries.js";
import { riebeckiteClientModule } from "./client_module.js";
import { riebeckiteContentWatch } from "./content_watch.js";
import { createRiebeckiteSsg } from "./ssg.js";
import type { RiebeckiteSsgOptions } from "./ssg_plugin.js";
import { resolveHonoxApplication } from "./vite_runner.js";
import { createWorkspacePackageAliases } from "./workspace_packages.js";

export type RiebeckiteIntegrationOptions = {
  configRoot?: string;
  workspaceRoot?: string;
  appRoot?: string;
  configFile?: string;
};

/**
 * SSR externals Riebeckite's own runtime requires the application to leave
 * external. These are internal to the integration: sites should not have to
 * restate the Vite `environments.ssr.resolve.external` list.
 */
export const defaultSsrExternals = [
  "extend",
  "debug",
  "node:fs/promises",
  "node:path",
  "parse-numeric-range",
  "slugify",
  "vfile-matter",
  "yaml",
] as const;

export type RiebeckiteViteOptions = RiebeckiteIntegrationOptions & {
  /** Extra SSR externals appended after Riebeckite's defaults. */
  ssrExternals?: readonly string[];
  /** SSG overrides. A normal site does not need them. */
  ssg?: RiebeckiteSsgOptions;
};

export function riebeckite(
  options: RiebeckiteIntegrationOptions = {},
): Plugin[] {
  let resolvedConfig: ResolvedRiebeckiteConfig | undefined;
  let contentWatchRoots: { appRoot: string; contentRoot: string } | undefined;
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
        contentWatchRoots = application;
        writeRiebeckiteAssetEntries(resolvedConfig, {
          pluginStyles: path.join(appRoot, "app/.riebeckite/plugin-styles.css"),
          themeStyles: path.join(appRoot, "app/.riebeckite/theme-styles.css"),
        });

        return {
          define: {
            "process.env.RIEBECKITE_APP_ROOT": JSON.stringify(appRoot),
          },
          server: {
            watch: {
              ignored: ["**/.riebeckite/**"],
            },
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
    riebeckiteContentWatch({
      appRoot: () => requireContentWatchRoots(contentWatchRoots).appRoot,
      contentRoot: () =>
        requireContentWatchRoots(contentWatchRoots).contentRoot,
      exclude: () => getConfig().content.exclude ?? [],
    }),
  ];
}

function requireContentWatchRoots(
  roots: { appRoot: string; contentRoot: string } | undefined,
): { appRoot: string; contentRoot: string } {
  if (!roots) {
    throw new Error("Riebeckite application has not been resolved yet.");
  }
  return roots;
}

/**
 * Higher-level helper that registers the complete Riebeckite Vite integration
 * without exposing internal Vite/HonoX/SSR details. A site only needs to add
 * its own plugins (for example the HonoX plugin and its deployment build
 * plugin) around this call.
 *
 * `riebeckite`, `riebeckiteSsg`, and `riebeckiteSsgExtensionMap` remain
 * available for callers that need the lower-level pieces.
 */
export function riebeckiteVite(options: RiebeckiteViteOptions = {}): Plugin[] {
  const { ssg, ssrExternals, ...integration } = options;
  return [
    ...riebeckite(integration),
    riebeckiteSsrExternals([...defaultSsrExternals, ...(ssrExternals ?? [])]),
    createRiebeckiteSsg(ssg),
  ];
}

function riebeckiteSsrExternals(externals: readonly string[]): Plugin {
  return {
    name: "riebeckite-ssr-externals",
    config() {
      return {
        environments: {
          ssr: {
            resolve: {
              external: [...externals],
            },
          },
        },
      };
    },
  };
}
