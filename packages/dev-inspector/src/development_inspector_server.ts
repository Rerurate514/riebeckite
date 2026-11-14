import crypto from "node:crypto";
import http from "node:http";
import { createDataMiddlewares } from "./development_inspector_middleware_data.js";
import { createReportMiddlewares } from "./development_inspector_middleware_report.js";
import {
  assetsPath,
  bootstrapPath,
  graphPath,
  outputPath,
  pluginsPath,
  provenancePath,
  reportPath,
  tabsPath,
} from "./development_inspector_paths.js";
import {
  handleInspectorRequest,
  isTrustedInspectorRequest,
  prioritizeMiddleware,
} from "./development_inspector_security.js";
import type { InspectorServerState } from "./development_inspector_server_types.js";

export function configureInspectorServer(
  state: InspectorServerState,
): () => void {
  const server = state.server;
  const token = crypto.randomUUID();
  const { reportMiddleware, outputMiddleware, assetsMiddleware } =
    createReportMiddlewares(state, server);
  const {
    graphMiddleware,
    pluginsMiddleware,
    provenanceMiddleware,
    tabsMiddleware,
  } = createDataMiddlewares(state, server);
  const privateServer = http.createServer((request, response) => {
    void handleInspectorRequest(request, response, token, {
      [reportPath]: reportMiddleware,
      [outputPath]: outputMiddleware,
      [graphPath]: graphMiddleware,
      [pluginsPath]: pluginsMiddleware,
      [provenancePath]: provenanceMiddleware,
      [assetsPath]: assetsMiddleware,
      [tabsPath]: tabsMiddleware,
      [`${tabsPath}/`]: tabsMiddleware,
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
  state.invalidators.set(server, () => state.invalidate(server));
  server.httpServer?.once("close", () => {
    state.clearInvalidation();
    state.invalidators.delete(server);
  });
  return () => {
    prioritizeMiddleware(server, bootstrapMiddleware, bootstrapPath);
  };
}
