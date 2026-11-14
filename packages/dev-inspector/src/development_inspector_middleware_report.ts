import { inspectThemeConfig, resolveApiLifecycle } from "@riebeckite/core";
import { sortDevelopmentDiagnostics } from "@riebeckite/diagnostics";
import type { ViteDevServer } from "vite";
import { inspectContentInventory } from "./development_inspector_content.js";
import { inspectorTabMetadata } from "./development_inspector_helpers.js";
import { serializeOutputResult } from "./development_inspector_output.js";
import { inspectBuildPerformance } from "./development_inspector_performance.js";
import {
  currentPageFromRequest,
  currentPageSourceSlugs,
  outputQueryFromRequest,
} from "./development_inspector_query.js";
import type {
  InspectorMiddleware,
  InspectorServerState,
} from "./development_inspector_server_types.js";

export function createReportMiddlewares(
  state: InspectorServerState,
  server: ViteDevServer,
): {
  reportMiddleware: InspectorMiddleware;
  outputMiddleware: InspectorMiddleware;
  assetsMiddleware: InspectorMiddleware;
} {
  const reportMiddleware = async (
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse,
  ) => {
    try {
      const application = state.getApplication();
      const entry = state.inspect(application, state.getRevision(), server);
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
          inspectorTabs: (snapshot?.inspectorTabs ?? []).map(
            inspectorTabMetadata,
          ),
          apiLifecycle: resolveApiLifecycle(application.config),
          content: inspectContentInventory(snapshot),
          performance: snapshot ? inspectBuildPerformance(snapshot) : undefined,
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
      const application = state.getApplication();
      const entry = state.inspect(application, state.getRevision(), server);
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
  const assetsMiddleware = async (
    _request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse,
  ) => {
    try {
      const application = state.getApplication();
      const entry = state.inspect(application, state.getRevision(), server);
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
  return { reportMiddleware, outputMiddleware, assetsMiddleware };
}
