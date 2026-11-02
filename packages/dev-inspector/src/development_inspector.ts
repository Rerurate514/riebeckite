import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import {
  type CompletedContentBuildSnapshot,
  loadContentBuildState,
  resolveApiLifecycle,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import {
  collectDevelopmentDiagnostics,
  sortDevelopmentDiagnostics,
} from "@riebeckite/diagnostics";
import {
  isIgnoredContentPath,
  isPathInsideDirectory,
  toLogicalPath,
} from "@riebeckite/node";
import type { Plugin, ViteDevServer } from "vite";
import type { ResolvedInspectorApplication } from "./application.js";
import { inspectorClientModule } from "./development_inspector_client.js";
import {
  graphQueryFromRequest,
  inspectDependencyGraph,
} from "./development_inspector_graph.js";
import {
  inspectAssets,
  inspectContentOutputs,
  serializeOutputResult,
  unavailableAssetResult,
  unavailableOutputResult,
} from "./development_inspector_output.js";
import {
  assetsPath,
  bootstrapPath,
  graphPath,
  outputPath,
  pluginsPath,
  provenancePath,
  reportPath,
} from "./development_inspector_paths.js";
import {
  inspectPluginExecution,
  pluginExecutionQueryFromRequest,
} from "./development_inspector_plugins.js";
import {
  currentPageFromRequest,
  currentPageSourceSlugs,
  outputQueryFromRequest,
} from "./development_inspector_query.js";
import {
  handleInspectorRequest,
  isTrustedInspectorRequest,
  prioritizeMiddleware,
} from "./development_inspector_security.js";
import { inspectThemeConfig } from "./development_inspector_theme.js";
import type {
  CachedInspection,
  ContentAppModule,
} from "./development_inspector_types.js";

const clientModuleId = "virtual:riebeckite/development-inspector";
const resolvedClientModuleId = `\0${clientModuleId}`;
const invalidationDelayMs = 150;

export { diagnosticMatchesPage } from "./development_inspector_query.js";

export function riebeckiteDevelopmentInspector(
  getApplication: () => ResolvedInspectorApplication,
): Plugin {
  let revision = 0;
  let invalidatedAt = 0;
  let inspection: CachedInspection | null = null;
  let invalidationTimer: ReturnType<typeof setTimeout> | undefined;
  const invalidateInspection = (server: ViteDevServer) => {
    invalidatedAt = Date.now();
    if (invalidationTimer) clearTimeout(invalidationTimer);
    invalidationTimer = setTimeout(() => {
      invalidationTimer = undefined;
      revision += 1;
      server.hot.send({ type: "custom", event: "riebeckite:inspector" });
    }, invalidationDelayMs);
  };
  const inspectApplication = (
    application: ResolvedInspectorApplication,
    currentRevision: number,
    server: ViteDevServer,
  ): CachedInspection => {
    if (
      inspection?.revision === currentRevision &&
      inspection.application === application
    ) {
      return inspection;
    }
    if (inspection) inspection = null;
    const snapshot = completedBuildSnapshot(application, server).then(
      (build) =>
        build && build.completedAt >= invalidatedAt ? build : undefined,
    );
    const report = snapshot.then((build) =>
      collectDevelopmentDiagnostics({
        config: application.config,
        contentDiagnostics: build?.manifest.diagnostics,
        revision: currentRevision,
        includeOutput: false,
      }),
    );
    const output = snapshot.then((build) =>
      build
        ? inspectContentOutputs(build, application)
        : unavailableOutputResult(),
    );
    const assets = snapshot.then((build) =>
      build ? inspectAssets(build, application) : unavailableAssetResult(),
    );
    const entry: CachedInspection = {
      application,
      revision: currentRevision,
      snapshot,
      report,
      output,
      assets,
      settlement: Promise.allSettled([snapshot, report, output, assets]).then(
        (results) => {
          const [snapshotResult] = results;
          if (
            results.some((result) => result.status === "rejected") ||
            (snapshotResult.status === "fulfilled" && !snapshotResult.value)
          ) {
            if (inspection === entry) inspection = null;
          }
        },
      ),
    };
    inspection = entry;
    return entry;
  };
  return {
    name: "riebeckite-development-inspector",
    apply: "serve",
    enforce: "pre",
    resolveId(id) {
      return id === clientModuleId ? resolvedClientModuleId : null;
    },
    load(id) {
      return id === resolvedClientModuleId ? inspectorClientModule() : null;
    },
    configureServer(server) {
      const token = crypto.randomUUID();
      const reportMiddleware = async (
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
      ) => {
        try {
          const application = getApplication();
          const entry = inspectApplication(application, revision, server);
          const report = await entry.report;
          const currentPage = currentPageFromRequest(request.url);
          const snapshot = await entry.snapshot;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              ...report,
              generatedAt: new Date().toISOString(),
              currentPage,
              currentPageSources: currentPageSourceSlugs(
                snapshot?.manifest,
                currentPage,
              ),
              theme: application.config.theme.name,
              themeConfig: inspectThemeConfig(application.config.theme),
              plugins: application.config.plugins.map((plugin, index) => ({
                name: plugin.name,
                order: index + 1,
                enabled: plugin.enabled !== false,
              })),
              derivedViews: snapshot?.derivedViews ?? [],
              apiLifecycle: resolveApiLifecycle(application.config),
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_REPORT_FAILED" }));
        }
      };
      const outputMiddleware = async (
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
      ) => {
        try {
          const application = getApplication();
          const entry = inspectApplication(application, revision, server);
          const result = await entry.output;
          const query = outputQueryFromRequest(request.url);
          const responseBody = serializeOutputResult(result, query);
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              version: 1,
              revision: entry.revision,
              generatedAt: new Date().toISOString(),
              ...responseBody,
              diagnostics: sortDevelopmentDiagnostics(result.diagnostics),
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_OUTPUT_FAILED" }));
        }
      };
      const graphMiddleware = async (
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
      ) => {
        try {
          const application = getApplication();
          const entry = inspectApplication(application, revision, server);
          const snapshot = await entry.snapshot;
          const graph = snapshot
            ? inspectDependencyGraph(
                snapshot,
                graphQueryFromRequest(request.url),
              )
            : {
                status: "unavailable" as const,
                reason:
                  "no completed development build is available for this revision",
              };
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              version: 1,
              revision: entry.revision,
              generatedAt: new Date().toISOString(),
              graph,
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_GRAPH_FAILED" }));
        }
      };
      const pluginsMiddleware = async (
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
      ) => {
        try {
          const application = getApplication();
          const entry = inspectApplication(application, revision, server);
          const snapshot = await entry.snapshot;
          const pluginExecution = inspectPluginExecution(
            snapshot,
            pluginExecutionQueryFromRequest(request.url),
          );
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              version: 1,
              revision: entry.revision,
              generatedAt: new Date().toISOString(),
              pluginExecution,
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_PLUGINS_FAILED" }));
        }
      };
      const provenanceMiddleware = async (
        _request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
      ) => {
        try {
          const application = getApplication();
          const entry = inspectApplication(application, revision, server);
          const snapshot = await entry.snapshot;
          const snapshotProvenance = snapshot?.provenance;
          const persisted = snapshotProvenance
            ? await loadContentBuildState(
                resolveContentBuildStatePath(application.config, undefined),
              )
            : undefined;
          const persistedProvenance = persisted?.provenance;
          const provenance =
            persistedProvenance?.buildId === snapshotProvenance?.buildId
              ? persistedProvenance
              : snapshotProvenance;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              version: 1,
              revision: entry.revision,
              generatedAt: new Date().toISOString(),
              provenance: provenance ?? null,
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_PROVENANCE_FAILED" }));
        }
      };
      const assetsMiddleware = async (
        _request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
      ) => {
        try {
          const application = getApplication();
          const entry = inspectApplication(application, revision, server);
          const result = await entry.assets;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              version: 1,
              revision: entry.revision,
              generatedAt: new Date().toISOString(),
              assets: result,
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_ASSETS_FAILED" }));
        }
      };
      const privateServer = http.createServer((request, response) => {
        void handleInspectorRequest(request, response, token, {
          [reportPath]: reportMiddleware,
          [outputPath]: outputMiddleware,
          [graphPath]: graphMiddleware,
          [pluginsPath]: pluginsMiddleware,
          [provenancePath]: provenanceMiddleware,
          [assetsPath]: assetsMiddleware,
        });
      });
      const privateReady = new Promise<void>((resolve, reject) => {
        privateServer.once("error", reject);
        privateServer.listen(0, "127.0.0.1", () => {
          privateServer.off("error", reject);
          privateServer.on("error", () => privateServer.close());
          privateServer.unref();
          resolve();
        });
      });
      const bootstrapMiddleware = async (
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
      ) => {
        if (!isTrustedInspectorRequest(request, server)) {
          response.statusCode = 403;
          response.end();
          return;
        }
        try {
          await privateReady;
          const address = privateServer.address();
          if (!address || typeof address === "string") {
            throw new Error("Inspector server address is unavailable.");
          }
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.setHeader("vary", "Origin");
          response.end(
            JSON.stringify({
              origin: `http://127.0.0.1:${address.port}`,
              token,
            }),
          );
        } catch {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "INSPECTOR_BOOTSTRAP_FAILED" }));
        }
      };
      server.middlewares.use(bootstrapPath, bootstrapMiddleware);
      server.httpServer?.once("close", () => privateServer.close());
      return () => {
        prioritizeMiddleware(server, bootstrapMiddleware, bootstrapPath);
        const handle = (file: string) => {
          let application: ResolvedInspectorApplication;
          try {
            application = getApplication();
          } catch {
            return;
          }
          if (!isContentWatchTarget(application, file)) return;
          invalidateInspection(server);
        };
        server.watcher.on("add", handle);
        server.watcher.on("unlink", handle);
        server.httpServer?.once("close", () => {
          if (invalidationTimer) clearTimeout(invalidationTimer);
          server.watcher.off("add", handle);
          server.watcher.off("unlink", handle);
        });
      };
    },
    handleHotUpdate({ file, server }) {
      let application: ResolvedInspectorApplication | undefined;
      try {
        application = getApplication();
      } catch {
        application = undefined;
      }
      if (!shouldInvalidateInspection(application, file)) return;
      invalidateInspection(server);
    },
  };
}

async function completedBuildSnapshot(
  application: ResolvedInspectorApplication,
  server: ViteDevServer,
): Promise<CompletedContentBuildSnapshot | undefined> {
  const entry = path.join(application.appRoot, "app", "server.ts");
  const moduleGraph = server.environments?.ssr?.moduleGraph;
  const entryLoaded =
    moduleGraph?.getModuleById(entry) ??
    [...(moduleGraph?.idToModuleMap?.values() ?? [])].find(
      (module) =>
        module.file && path.resolve(module.file) === path.resolve(entry),
    );
  if (!entryLoaded) {
    return undefined;
  }
  const module = (await server.ssrLoadModule(entry)) as ContentAppModule;
  return module.content?.getCompletedBuildSnapshot();
}

function shouldInvalidateInspection(
  application: ResolvedInspectorApplication | undefined,
  file: string,
): boolean {
  if (!application) return true;
  return (
    !isPathInsideDirectory(application.appRoot, file) ||
    isPathInsideDirectory(application.contentRoot, file) ||
    file === application.configFile
  );
}

function isContentWatchTarget(
  application: ResolvedInspectorApplication,
  file: string,
): boolean {
  if (!isPathInsideDirectory(application.contentRoot, file)) return false;
  return !isIgnoredContentPath(
    toLogicalPath(application.contentRoot, file),
    application.config.content.exclude ?? [],
  );
}
