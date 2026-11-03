import crypto from "node:crypto";
import http from "node:http";
import { createRequire } from "node:module";
import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import type { Plugin, ViteDevServer } from "vite";
import {
  isLoopbackAddress,
  isLoopbackHost,
  isTrustedInspectorRequest,
} from "./development_inspector_security.js";

const bridgePath = "/__riebeckite/bridge/v1";
const bridgePagePath = "/__riebeckite/bridge/v1/page";
const bridgeBootstrapPath = "/__riebeckite/bridge/bootstrap";
const bridgeProtocolVersion = 1;
const bridgeTokenHeader = "x-riebeckite-bridge-token";
const bridgeProtocolHeader = "x-riebeckite-bridge-protocol";
const invalidators = new WeakMap<ViteDevServer, () => void>();
const riebeckiteVersion = (
  createRequire(import.meta.url)("../package.json") as { version: string }
).version;

export type RiebeckiteBridgeOptions = {
  token?: string;
  publicOrigin?: string;
  getSnapshot: (
    server: ViteDevServer,
  ) =>
    | CompletedContentBuildSnapshot
    | undefined
    | Promise<CompletedContentBuildSnapshot | undefined>;
};

export function invalidateRiebeckiteBridge(server: ViteDevServer): void {
  invalidators.get(server)?.();
}

export function riebeckiteBridge(options: RiebeckiteBridgeOptions): Plugin {
  return {
    name: "riebeckite-bridge",
    apply: "serve",
    configureServer(server) {
      const token = options.token;
      if (!token || token.length < 32) return;

      let revision = 0;
      const serverId = crypto.randomUUID();
      const privateServer = http.createServer(async (request, response) => {
        if (!isTrustedBridgeRequest(request, token)) {
          response.statusCode = 403;
          response.end();
          return;
        }
        if (request.method !== "GET") {
          response.statusCode = 405;
          response.end();
          return;
        }
        const requestUrl = new URL(request.url ?? "/", "http://localhost");
        if (
          requestUrl.pathname !== bridgePath &&
          requestUrl.pathname !== bridgePagePath
        ) {
          response.statusCode = 404;
          response.end();
          return;
        }
        if (
          request.headers[bridgeProtocolHeader] !== `${bridgeProtocolVersion}`
        ) {
          response.statusCode = 426;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              code: "INCOMPATIBLE_PROTOCOL",
              supportedProtocolVersions: [bridgeProtocolVersion],
            }),
          );
          return;
        }
        try {
          const snapshot = await options.getSnapshot(server);
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.setHeader("x-content-type-options", "nosniff");
          response.end(
            JSON.stringify(
              requestUrl.pathname === bridgePagePath
                ? resolvePage(snapshot, requestUrl, options.publicOrigin)
                : {
                    protocolVersion: bridgeProtocolVersion,
                    server: { id: serverId, version: riebeckiteVersion },
                    capabilities: ["status", "page-resolution", "preview"],
                    development: {
                      available: true,
                      revision,
                      build: snapshot
                        ? { status: "ready", completedAt: snapshot.completedAt }
                        : { status: "unavailable" },
                    },
                    inspection: { available: snapshot !== undefined },
                  },
            ),
          );
        } catch {
          response.statusCode = 503;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ code: "BRIDGE_STATUS_UNAVAILABLE" }));
        }
      });
      const privateReady = new Promise<void>((resolve, reject) => {
        privateServer.once("listening", resolve);
        privateServer.once("error", reject);
      });
      privateServer.listen(0, "127.0.0.1");
      privateServer.unref();

      const bootstrap = async (
        request: http.IncomingMessage,
        response: http.ServerResponse,
      ): Promise<void> => {
        if (
          !isTrustedInspectorRequest(request, server) ||
          !matchesToken(request.headers[bridgeTokenHeader], token)
        ) {
          response.statusCode = 403;
          response.end();
          return;
        }
        try {
          await privateReady;
        } catch {
          response.statusCode = 503;
          response.end(JSON.stringify({ code: "BRIDGE_UNAVAILABLE" }));
          return;
        }
        const address = privateServer.address();
        if (!address || typeof address === "string") {
          response.statusCode = 503;
          response.end(JSON.stringify({ code: "BRIDGE_UNAVAILABLE" }));
          return;
        }
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.setHeader("cache-control", "no-store");
        response.setHeader("x-content-type-options", "nosniff");
        response.end(
          JSON.stringify({ origin: `http://127.0.0.1:${address.port}` }),
        );
      };
      server.middlewares.use(bridgeBootstrapPath, bootstrap);
      invalidators.set(server, () => {
        revision += 1;
      });
      server.httpServer?.once("close", () => {
        invalidators.delete(server);
        privateServer.close();
      });
    },
  };
}

function resolvePage(
  snapshot: CompletedContentBuildSnapshot | undefined,
  requestUrl: URL,
  publicOrigin: string | undefined,
): Record<string, unknown> {
  const source = requestUrl.searchParams.get("source");
  if (!source || !isContentPath(source)) {
    return { status: "invalid-source" };
  }
  if (!snapshot) return { status: "unavailable" };

  const sourceKey = source
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "")
    .toLowerCase();
  const slug = snapshot.manifest.contentIndex.get(sourceKey);
  if (!slug) return { status: "not-found", source };
  const entry = snapshot.manifest.bySlug.get(slug);
  if (!entry) return { status: "not-found", source };

  const productionUrl = resolvePublicUrl(publicOrigin, entry.permalink);
  return {
    status: "resolved",
    source,
    page: entry.permalink,
    visibility: entry.publishing.visibility,
    routable: entry.publishing.routable,
    discoverable: entry.publishing.discoverable,
    locale: entry.publicLocation.language ?? null,
    publishAt: entry.publishing.publishAt?.toISOString() ?? null,
    revision: snapshot.completedAt,
    productionUrl,
  };
}

function resolvePublicUrl(
  origin: string | undefined,
  page: string,
): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" || url.protocol === "https:"
      ? new URL(page, url).toString()
      : null;
  } catch {
    return null;
  }
}

function isContentPath(value: string): boolean {
  return !(
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.split(/[\\/]+/).some((part) => part === ".." || part === "")
  );
}

function isTrustedBridgeRequest(
  request: http.IncomingMessage,
  token: string,
): boolean {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false;
  if (!isLoopbackHost(request.headers.host)) return false;
  if (request.headers.origin !== undefined) return false;
  for (const header of [
    "forwarded",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-real-ip",
  ]) {
    if (request.headers[header] !== undefined) return false;
  }
  return matchesToken(request.headers[bridgeTokenHeader], token);
}

function matchesToken(
  provided: string | string[] | undefined,
  expected: string,
): boolean {
  if (typeof provided !== "string") return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return (
    providedBytes.length === expectedBytes.length &&
    crypto.timingSafeEqual(providedBytes, expectedBytes)
  );
}
