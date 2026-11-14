import {
  inspectDependencyGraph,
  inspectPluginExecution,
  loadContentBuildState,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import type { ViteDevServer } from "vite";
import {
  inspectorTabMetadata,
  resolveInspectorClientUrl,
} from "./development_inspector_helpers.js";
import { tabsPath } from "./development_inspector_paths.js";
import {
  graphQueryFromRequest,
  pluginExecutionQueryFromRequest,
} from "./development_inspector_query.js";
import { requestPathname } from "./development_inspector_security.js";
import type {
  InspectorMiddleware,
  InspectorServerState,
} from "./development_inspector_server_types.js";

export function createDataMiddlewares(
  state: InspectorServerState,
  server: ViteDevServer,
): {
  graphMiddleware: InspectorMiddleware;
  pluginsMiddleware: InspectorMiddleware;
  provenanceMiddleware: InspectorMiddleware;
  tabsMiddleware: InspectorMiddleware;
} {
  const graphMiddleware = async (
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse,
  ) => {
    try {
      const application = state.getApplication();
      const entry = state.inspect(application, state.getRevision(), server);
      const snapshot = await entry.snapshot;
      const graph = snapshot
        ? inspectDependencyGraph(snapshot, graphQueryFromRequest(request.url))
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
      const application = state.getApplication();
      const entry = state.inspect(application, state.getRevision(), server);
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
      const application = state.getApplication();
      const entry = state.inspect(application, state.getRevision(), server);
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
  const tabsMiddleware = async (
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse,
  ) => {
    try {
      const application = state.getApplication();
      const entry = state.inspect(application, state.getRevision(), server);
      const snapshot = await entry.snapshot;
      const pathname = requestPathname(request.url);
      const id =
        pathname === tabsPath
          ? undefined
          : decodeURIComponent(pathname.slice(tabsPath.length + 1));
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.setHeader("cache-control", "no-store");
      if (id === undefined) {
        response.end(
          JSON.stringify({
            version: 1,
            revision: entry.revision,
            generatedAt: new Date().toISOString(),
            tabs: (snapshot?.inspectorTabs ?? []).map(inspectorTabMetadata),
          }),
        );
        return;
      }
      const tab = snapshot?.inspectorTabs.find(
        (candidate) => candidate.id === id,
      );
      if (!tab) {
        response.statusCode = 404;
        response.end(JSON.stringify({ code: "INSPECTOR_TAB_NOT_FOUND" }));
        return;
      }
      const client = tab.client
        ? resolveInspectorClientUrl(application.appRoot, tab.client)
        : {};
      response.end(
        JSON.stringify({
          version: 1,
          revision: entry.revision,
          generatedAt: new Date().toISOString(),
          tab: {
            ...inspectorTabMetadata(tab),
            data: tab.data,
            clientUrl: client.url,
            clientError: client.error,
          },
        }),
      );
    } catch {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ code: "INSPECTOR_TAB_FAILED" }));
    }
  };
  return {
    graphMiddleware,
    pluginsMiddleware,
    provenanceMiddleware,
    tabsMiddleware,
  };
}
