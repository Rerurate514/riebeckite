import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import {
  invalidateDevelopmentInspector,
  invalidateRiebeckiteBridge,
  riebeckiteBridge,
  riebeckiteDevelopmentInspector,
} from "@riebeckite/dev-inspector";
import { mergeConfig, type Plugin, type UserConfig } from "vite";
import { writeRiebeckiteAssetEntries } from "./asset_entries.js";
import { riebeckiteClientModule } from "./client_module.js";
import { riebeckiteConfigTemporaryDirectory } from "./config_loader.js";
import { riebeckiteContentAssets } from "./content_assets.js";
import { isContentModuleLoaded, loadContentModule } from "./content_module.js";
import { riebeckiteContentWatch } from "./content_watch.js";
import { riebeckiteRuntimeModules } from "./runtime_modules.js";
import { siteRiebeckiteExternals } from "./site_externals.js";
import { createRiebeckiteSsg } from "./ssg.js";
import type { RiebeckiteSsgOptions } from "./ssg_plugin.js";
import {
  type ResolvedHonoxApplication,
  resolveHonoxApplication,
} from "./vite_runner.js";
import { createWorkspacePackageAliases } from "./workspace_packages.js";

export type RiebeckiteIntegrationOptions = {
  configRoot?: string;
  workspaceRoot?: string;
  appRoot?: string;
  configFile?: string;
  bridgeToken?: string;
};

/**
 * SSR externals Riebeckite's own runtime requires the application to leave
 * external. These are internal to the integration: sites should not have to
 * restate the Vite `environments.ssr.resolve.external` list.
 */
export const defaultSsrExternals = [
  "hono",
  "hono/html",
  "hono/jsx",
  "hono/jsx/jsx-runtime",
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
  onApplicationResolved?: (application: ResolvedHonoxApplication) => void,
): Plugin[] {
  let resolvedConfig: ResolvedRiebeckiteConfig | undefined;
  let application: ResolvedHonoxApplication | undefined;
  let contentVitePlugins: Plugin[] = [];
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
        const resolvedApplication = await resolveHonoxApplication({
          configRoot: options.configRoot ?? appRoot,
          configFile: options.configFile,
          appRoot,
          workspaceRoot: options.workspaceRoot,
        });
        resolvedConfig = resolvedApplication.config;
        const resolved = resolvedConfig;
        contentVitePlugins = resolved.plugins.flatMap(
          (plugin) =>
            plugin.vitePlugins?.({
              contentDirectory: resolved.content.directory,
            }) ?? [],
        ) as Plugin[];
        application = resolvedApplication;
        onApplicationResolved?.(resolvedApplication);
        writeRiebeckiteAssetEntries(resolvedConfig, {
          frameworkStyles: path.join(
            appRoot,
            "app/.riebeckite/framework-styles.css",
          ),
          pluginStyles: path.join(appRoot, "app/.riebeckite/plugin-styles.css"),
          themeStyles: path.join(appRoot, "app/.riebeckite/theme-styles.css"),
        });

        return {
          define: {
            "process.env.RIEBECKITE_APP_ROOT": JSON.stringify(appRoot),
          },
          oxc: {
            jsx: { runtime: "automatic", importSource: "hono/jsx" },
          },
          server: {
            watch: {
              ignored: [
                "**/.riebeckite/**",
                `**/${riebeckiteConfigTemporaryDirectory}*/**`,
              ],
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
    contentVitePluginBridge(() => contentVitePlugins),
    contentBareImportResolver(() => requireApplication(application)),
    riebeckiteClientModule(getConfig),
    riebeckiteRuntimeModules(() => requireApplication(application)),
    riebeckiteContentAssets({
      appRoot: () => requireApplication(application).appRoot,
      contentRoot: () => requireApplication(application).contentRoot,
    }),
    riebeckiteContentWatch({
      appRoot: () => requireApplication(application).appRoot,
      contentRoot: () => requireApplication(application).contentRoot,
      exclude: () => getConfig().content.exclude ?? [],
      onInvalidate(server) {
        invalidateDevelopmentInspector(server);
        invalidateRiebeckiteBridge(server);
      },
    }),
    riebeckiteDevelopmentInspector(() => requireApplication(application), {
      async getSnapshot(server) {
        const { appRoot } = requireApplication(application);
        if (!isContentModuleLoaded(server, appRoot)) return undefined;
        const module = await loadContentModule(server, appRoot);
        return module.content?.getCompletedBuildSnapshot?.();
      },
    }),
    riebeckiteBridge({
      token: options.bridgeToken ?? process.env.RIEBECKITE_BRIDGE_TOKEN,
      mutationToken: process.env.RIEBECKITE_BRIDGE_MUTATION_TOKEN,
      mutationApprovalToken:
        process.env.RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN,
      contentRoot: () => requireApplication(application).contentRoot,
      publicOrigin: () => getConfig().site.baseUrl || undefined,
      async getSnapshot(server) {
        const { appRoot } = requireApplication(application);
        if (!isContentModuleLoaded(server, appRoot)) return undefined;
        const module = await loadContentModule(server, appRoot);
        return module.content?.getCompletedBuildSnapshot?.();
      },
    }),
  ];
}

function contentBareImportResolver(
  getApplication: () => ResolvedHonoxApplication,
): Plugin {
  return {
    name: "riebeckite-content-bare-imports",
    async resolveId(source, importer) {
      if (!importer || !isBareImport(source)) return null;
      const { appRoot, contentRoot } = getApplication();
      if (!isInDirectory(importer, contentRoot)) return null;
      return await this.resolve(source, path.join(appRoot, "package.json"), {
        skipSelf: true,
      });
    },
  };
}

function isBareImport(source: string): boolean {
  return (
    !source.startsWith(".") &&
    !path.isAbsolute(source) &&
    !source.startsWith("\0") &&
    !source.startsWith("node:")
  );
}

function isInDirectory(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

function contentVitePluginBridge(getPlugins: () => readonly Plugin[]): Plugin {
  return {
    name: "riebeckite-content-vite-plugins",
    async config(config, environment) {
      let result: UserConfig | undefined;
      for (const plugin of getPlugins()) {
        const next = await callPluginHook(
          plugin.config,
          this,
          config,
          environment,
        );
        if (next !== undefined) {
          result = mergeConfig(result ?? {}, next as UserConfig);
        }
      }
      return result;
    },
    async resolveId(source, importer, options) {
      for (const plugin of getPlugins()) {
        const result = await callPluginHook(
          plugin.resolveId,
          this,
          source,
          importer,
          options,
        );
        if (result != null) return result as never;
      }
      return null;
    },
    async load(id, options) {
      for (const plugin of getPlugins()) {
        const result = await callPluginHook(plugin.load, this, id, options);
        if (result != null) return result as never;
      }
      return null;
    },
    async transform(code, id, options) {
      let current = code;
      let map: unknown;
      let transformed = false;
      for (const plugin of getPlugins()) {
        const result = await callPluginHook(
          plugin.transform,
          this,
          current,
          id,
          options,
        );
        if (result == null) continue;
        if (typeof result === "string") {
          current = result;
          map = null;
          transformed = true;
          continue;
        }
        const next = result as { code?: string; map?: unknown };
        if (typeof next.code !== "string") continue;
        current = next.code;
        map = next.map;
        transformed = true;
      }
      return transformed ? ({ code: current, map } as never) : null;
    },
    configureServer(server) {
      const postHooks = getPlugins()
        .map((plugin) =>
          callPluginHookSynchronously(plugin.configureServer, server),
        )
        .filter((hook): hook is () => void => typeof hook === "function");
      return () => {
        for (const hook of postHooks) hook();
      };
    },
  };
}

async function callPluginHook(
  hook: unknown,
  context: unknown,
  ...arguments_: unknown[]
): Promise<unknown> {
  const handler =
    typeof hook === "function"
      ? hook
      : typeof hook === "object" && hook !== null && "handler" in hook
        ? hook.handler
        : undefined;
  return typeof handler === "function"
    ? handler.call(context, ...arguments_)
    : undefined;
}

function callPluginHookSynchronously(hook: unknown, context: unknown): unknown {
  const handler =
    typeof hook === "function"
      ? hook
      : typeof hook === "object" && hook !== null && "handler" in hook
        ? hook.handler
        : undefined;
  return typeof handler === "function"
    ? handler.call(context, context)
    : undefined;
}

function requireApplication(
  application: ResolvedHonoxApplication | undefined,
): ResolvedHonoxApplication {
  if (!application) {
    throw new Error("Riebeckite application has not been resolved yet.");
  }
  return application;
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
  const fallbackSiteRoot = integration.configRoot ?? integration.appRoot;
  let resolvedSiteRoot: string | undefined;
  return [
    ...riebeckite(integration, (application) => {
      resolvedSiteRoot = application.configRoot;
    }),
    riebeckiteSsrExternals(
      [...defaultSsrExternals, ...(ssrExternals ?? [])],
      () => {
        if (integration.workspaceRoot) return [];
        const siteRoot = resolvedSiteRoot ?? fallbackSiteRoot;
        return siteRoot ? siteRiebeckiteExternals(siteRoot) : [];
      },
    ),
    createRiebeckiteSsg(ssg),
  ];
}

function riebeckiteSsrExternals(
  externals: readonly string[],
  siteExternals: () => readonly string[] = () => [],
): Plugin {
  return {
    name: "riebeckite-ssr-externals",
    config() {
      return {
        environments: {
          ssr: {
            resolve: {
              external: [...externals, ...siteExternals()],
            },
          },
        },
      };
    },
  };
}
