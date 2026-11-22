import path from "node:path";
import { createMutationPathPolicy, resolveAiIntegration } from "@riebeckite/ai";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import {
  invalidateDevelopmentInspector,
  invalidateRiebeckiteBridge,
  riebeckiteBridge,
  riebeckiteDevelopmentInspector,
} from "@riebeckite/dev-inspector";
import {
  mergeConfig,
  type Plugin,
  type UserConfig,
  type ViteDevServer,
} from "vite";
import { writeRiebeckiteAssetEntries } from "./asset_entries.js";
import { riebeckiteClientModule } from "./client_module.js";
import { riebeckiteConfigTemporaryDirectory } from "./config_loader.js";
import { riebeckiteContentAssets } from "./content_assets.js";
import { isContentModuleLoaded, loadContentModule } from "./content_module.js";
import { riebeckiteContentWatch } from "./content_watch.js";
import { injectRiebeckiteClientBundle } from "./honox_islands.js";
import { riebeckiteRuntimeModules } from "./runtime_modules.js";
import { siteRiebeckiteExternals } from "./site_externals.js";
import { createRiebeckiteSsg } from "./ssg.js";
import type { RiebeckiteSsgOptions } from "./ssg_plugin.js";
import {
  callPluginHook,
  callPluginHookSynchronously,
  defaultSsrExternals,
  isBareImport,
  isInDirectory,
  type RiebeckiteIntegrationOptions,
} from "./vite_plugin_helpers.js";
import {
  type ResolvedHonoxApplication,
  resolveHonoxApplication,
} from "./vite_runner.js";
import { createWorkspacePackageAliases } from "./workspace_packages.js";

/**
 * SSR externals Riebeckite's own runtime requires the application to leave
 * external. These are internal to the integration: sites should not have to
 * restate the Vite `environments.ssr.resolve.external` list.
 */

export type RiebeckiteViteOptions = RiebeckiteIntegrationOptions & {
  warmContent?: boolean;
  /** Extra SSR externals appended after Riebeckite's defaults. */
  ssrExternals?: readonly string[];
  /** SSG overrides. A normal site does not need them. */
  ssg?: RiebeckiteSsgOptions;
};

export function riebeckite(
  options: RiebeckiteViteOptions = {},
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
  let applicationPromise: Promise<ResolvedHonoxApplication> | undefined;
  let applicationAppRoot = "";
  let contentFormatRegistryFactory:
    | typeof import("@riebeckite/core")["createContentFormatRegistry"]
    | undefined;
  const ensureApplication = () =>
    (applicationPromise ??= (async () => {
      const core = await import("@riebeckite/core");
      contentFormatRegistryFactory = core.createContentFormatRegistry;
      const resolvedApplication = await resolveHonoxApplication({
        configRoot: options.configRoot ?? applicationAppRoot,
        configFile: options.configFile,
        appRoot: applicationAppRoot,
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
      await writeRiebeckiteAssetEntries(resolvedConfig, {
        frameworkStyles: path.join(
          applicationAppRoot,
          "app/.riebeckite/framework-styles.css",
        ),
        pluginStyles: path.join(
          applicationAppRoot,
          "app/.riebeckite/plugin-styles.css",
        ),
        themeStyles: path.join(
          applicationAppRoot,
          "app/.riebeckite/theme-styles.css",
        ),
      });
      return resolvedApplication;
    })());

  return [
    {
      name: "riebeckite-host-integration",
      async config(userConfig, environment) {
        const root = userConfig.root
          ? path.resolve(userConfig.root)
          : process.cwd();
        applicationAppRoot = options.appRoot ?? root;
        void ensureApplication().catch(() => {});
        if (environment.command === "build") {
          await ensureApplication();
        }

        return {
          define: {
            "process.env.RIEBECKITE_APP_ROOT":
              JSON.stringify(applicationAppRoot),
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
              ? await createWorkspacePackageAliases(options.workspaceRoot)
              : [],
          },
        };
      },
      configureServer(server) {
        applicationPromise?.catch((error: unknown) => {
          server.config.logger.error(
            "Failed to resolve Riebeckite application.",
            {
              error: error instanceof Error ? error : new Error(String(error)),
            },
          );
        });
      },
    },
    contentVitePluginBridge(() => contentVitePlugins),
    contentBareImportResolver(
      () => requireApplication(application),
      ensureApplication,
    ),
    injectRiebeckiteClientBundle(getConfig, ensureApplication),
    riebeckiteClientModule(getConfig, ensureApplication),
    riebeckiteRuntimeModules(
      () => requireApplication(application),
      ensureApplication,
    ),
    riebeckiteContentWarmup(options.warmContent ?? true, ensureApplication),
    riebeckiteContentAssets({
      appRoot: async () => (await ensureApplication()).appRoot,
      contentRoot: async () => (await ensureApplication()).contentRoot,
    }),
    riebeckiteContentWatch({
      appRoot: async () => (await ensureApplication()).appRoot,
      contentRoot: async () => (await ensureApplication()).contentRoot,
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
        await module.content?.getManifest?.();
        return module.content?.getCompletedBuildSnapshot?.();
      },
    }),
    riebeckiteBridge({
      token: options.bridgeToken ?? process.env.RIEBECKITE_BRIDGE_TOKEN,
      mutationToken: process.env.RIEBECKITE_BRIDGE_MUTATION_TOKEN,
      mutationApprovalToken:
        process.env.RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN,
      contentRoot: () => requireApplication(application).contentRoot,
      contentFormats: () => {
        if (!contentFormatRegistryFactory) {
          throw new Error("Riebeckite config has not been loaded yet.");
        }
        return contentFormatRegistryFactory(getConfig().plugins);
      },
      publicOrigin: () => getConfig().site.baseUrl || undefined,
      isMutationPathAllowed: () =>
        createMutationPathPolicy(
          resolveAiIntegration(getConfig().integrations?.ai).mutationPolicy,
        ),
      project: () => ({
        contentDirectory: getConfig().content.directory,
        locale: getConfig().site.locale,
        mutationPolicy: resolveAiIntegration(getConfig().integrations?.ai)
          .mutationPolicy,
      }),
      async getSnapshot(server) {
        const { appRoot } = requireApplication(application);
        if (!isContentModuleLoaded(server, appRoot)) return undefined;
        const module = await loadContentModule(server, appRoot);
        await module.content?.getManifest?.();
        return module.content?.getCompletedBuildSnapshot?.();
      },
    }),
  ];
}

export function riebeckiteContentWarmup(
  enabled: boolean,
  getApplication: () => Promise<ResolvedHonoxApplication>,
): Plugin {
  return {
    name: "riebeckite-content-warmup",
    apply: "serve",
    configureServer(server) {
      if (!enabled || !server.httpServer) return;
      server.httpServer.once("listening", () => {
        const origin = server.resolvedUrls?.local?.[0];
        if (origin) warmFirstPage(server, origin);
        else warmContentManifest(server, getApplication);
      });
    },
  };
}

function warmContentManifest(
  server: ViteDevServer,
  getApplication: () => Promise<ResolvedHonoxApplication>,
): void {
  void (async () => {
    const { appRoot } = await getApplication();
    const module = await loadContentModule(server, appRoot);
    await module.content?.getManifest?.();
  })().catch((error: unknown) => {
    server.config.logger.error("Riebeckite content warmup failed.", {
      error: error instanceof Error ? error : new Error(String(error)),
    });
  });
}

function warmFirstPage(server: ViteDevServer, origin: string): void {
  const logger = server.config.logger;
  const originalInfo = logger.info.bind(logger);
  let banner: (() => void) | undefined;
  logger.info = (message, options) => {
    const plain = message
      .split(`${String.fromCharCode(27)}[`)
      .map((part) => part.replace(/^[0-9;]*m/, ""))
      .join("");
    if (plain.includes("VITE v") && plain.includes("ready in")) {
      banner = () => originalInfo(message, options);
      return;
    }
    originalInfo(message, options);
  };
  const printUrls = server.printUrls.bind(server);
  server.printUrls = () => {};
  const quiet =
    process.env.RIEBECKITE_DEV_INDICATOR === "1" ||
    process.env.RIEBECKITE_MANAGED_DEV_CONTROL_FD !== undefined;
  const startedAt = performance.now();
  const elapsed = () =>
    `${((performance.now() - startedAt) / 1000).toFixed(1)}s`;
  const progress = (message: string) => logger.info(message, { clear: true });
  if (!quiet) progress(`riebeckite: preparing the first page (${elapsed()})`);
  const ticker = quiet
    ? undefined
    : setInterval(() => {
        progress(`riebeckite: preparing the first page (${elapsed()})`);
      }, 5000);
  ticker?.unref();
  void waitForDevWarmup(origin).then((status) => {
    if (ticker) clearInterval(ticker);
    banner?.();
    printUrls();
    if (status === undefined) {
      logger.error(`riebeckite: dev server did not respond (${elapsed()})`);
      return;
    }
    const suffix = status >= 400 ? ` (HTTP ${status})` : "";
    if (!quiet)
      progress(`riebeckite: ready at ${origin}${suffix} (${elapsed()})`);
  });
}

async function waitForDevWarmup(
  origin: string,
  timeoutMs = 300_000,
): Promise<number | undefined> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    try {
      return (await fetch(origin, { redirect: "manual" })).status;
    } catch {}
    await new Promise((resolve) => {
      setTimeout(resolve, 100).unref();
    });
  }
  return undefined;
}

function contentBareImportResolver(
  getApplication: () => ResolvedHonoxApplication,
  ensure: () => Promise<unknown>,
): Plugin {
  return {
    name: "riebeckite-content-bare-imports",
    async resolveId(source, importer) {
      if (!importer || !isBareImport(source)) return null;
      await ensure();
      const { appRoot, contentRoot } = getApplication();
      if (!isInDirectory(importer, contentRoot)) return null;
      return await this.resolve(source, path.join(appRoot, "package.json"), {
        skipSelf: true,
      });
    },
  };
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

export type { RiebeckiteIntegrationOptions } from "./vite_plugin_helpers.js";
export { defaultSsrExternals } from "./vite_plugin_helpers.js";
