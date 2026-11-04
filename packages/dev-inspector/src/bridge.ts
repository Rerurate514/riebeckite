import crypto from "node:crypto";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import type { Plugin, ViteDevServer } from "vite";
import {
  inspectBridgeDiagnostics,
  inspectBridgeImpact,
  inspectBridgePage,
  inspectBridgePreview,
  inspectBridgePublication,
  resolveBridgeSource,
} from "./bridge_inspection.js";
import {
  type BridgeMutationStore,
  createBridgeMutationStore,
  isMutationOperations,
} from "./bridge_mutation.js";
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
const bridgeMutationTokenHeader = "x-riebeckite-bridge-mutation-token";
const invalidators = new WeakMap<ViteDevServer, () => void>();
const riebeckiteVersion = (
  createRequire(import.meta.url)("../package.json") as { version: string }
).version;

export type RiebeckiteBridgeOptions = {
  token?: string;
  mutationToken?: string;
  mutationApprovalToken?: string;
  contentRoot?: string | (() => string);
  siteId?: string | (() => string | undefined);
  siteName?: string | (() => string | undefined);
  contentRootId?: string | (() => string | undefined);
  contentSourceKind?:
    | "integrated"
    | "separate-local"
    | "separate-git"
    | "custom-mapping";
  publicOrigin?: string | (() => string | undefined);
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
      let mutations: BridgeMutationStore | undefined;
      const eventClients = new Set<http.ServerResponse>();
      const serverId = crypto.randomUUID();
      const privateServer = http.createServer(async (request, response) => {
        if (!isTrustedBridgeRequest(request, token)) {
          response.statusCode = 403;
          response.end();
          return;
        }
        if (request.method !== "GET" && request.method !== "POST") {
          response.statusCode = 405;
          response.end();
          return;
        }
        const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
        if (!isBridgePath(requestUrl.pathname)) {
          response.statusCode = 404;
          response.end();
          return;
        }
        if (
          request.method === "POST" &&
          !requestUrl.pathname.startsWith(`${bridgePath}/mutations/`)
        ) {
          response.statusCode = 405;
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
          if (request.method === "POST") {
            if (
              !options.mutationToken ||
              options.mutationToken.length < 32 ||
              !options.mutationApprovalToken ||
              options.mutationApprovalToken.length < 32 ||
              options.mutationToken === options.mutationApprovalToken
            ) {
              response.statusCode = 404;
              response.end();
              return;
            }
            const contentRoot =
              typeof options.contentRoot === "function"
                ? options.contentRoot()
                : options.contentRoot;
            if (!contentRoot) {
              response.statusCode = 503;
              response.end(
                JSON.stringify({ code: "BRIDGE_STATUS_UNAVAILABLE" }),
              );
              return;
            }
            mutations ??= createBridgeMutationStore(
              contentRoot,
              options.mutationApprovalToken,
            );
            await bridgeMutationResponse(
              request,
              response,
              requestUrl,
              mutations,
              options.mutationToken,
            );
            return;
          }
          if (requestUrl.pathname === `${bridgePath}/events`) {
            response.writeHead(200, {
              "content-type": "text/event-stream; charset=utf-8",
              "cache-control": "no-store",
              connection: "keep-alive",
              "x-content-type-options": "nosniff",
            });
            response.write(
              `event: state\ndata: ${JSON.stringify({ revision, build: snapshot ? "ready" : "unavailable" })}\n\n`,
            );
            eventClients.add(response);
            request.once("close", () => eventClients.delete(response));
            return;
          }
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.setHeader("x-content-type-options", "nosniff");
          response.end(
            JSON.stringify(
              bridgeResponse({
                requestUrl,
                snapshot,
                server,
                options,
                revision,
                serverId,
              }),
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
        for (const client of eventClients) {
          client.write(
            `event: content.changed\ndata: ${JSON.stringify({ revision })}\n\n`,
          );
        }
      });
      server.httpServer?.once("close", () => {
        invalidators.delete(server);
        for (const client of eventClients) client.end();
        eventClients.clear();
        privateServer.close();
      });
    },
  };
}

function isBridgePath(pathname: string): boolean {
  return (
    pathname === bridgePath ||
    pathname === bridgePagePath ||
    pathname.startsWith(`${bridgePath}/mutations/`) ||
    [
      "source",
      "preview",
      "publication",
      "diagnostics",
      "impact",
      "events",
    ].some((name) => pathname === `${bridgePath}/${name}`)
  );
}

async function bridgeMutationResponse(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  requestUrl: URL,
  mutations: BridgeMutationStore,
  mutationToken: string,
): Promise<void> {
  if (request.headers["content-type"] !== "application/json") {
    response.statusCode = 415;
    response.end();
    return;
  }
  const body = await readJson(request);
  if (!body) {
    response.statusCode = 400;
    response.end(JSON.stringify({ code: "INVALID_REQUEST" }));
    return;
  }
  const path = requestUrl.pathname;
  if (
    !matchesToken(request.headers[bridgeMutationTokenHeader], mutationToken)
  ) {
    response.statusCode = 403;
    response.end();
    return;
  }
  if (path === `${bridgePath}/mutations/plan`) {
    if (!isMutationOperations(body.operations)) {
      response.statusCode = 400;
      response.end(JSON.stringify({ code: "INVALID_OPERATIONS" }));
      return;
    }
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify(await mutations.plan(body.operations)));
    return;
  }
  const match = /^\/__riebeckite\/bridge\/v1\/mutations\/([^/]+)\/apply$/.exec(
    path,
  );
  if (!match) {
    response.statusCode = 404;
    response.end();
    return;
  }
  const [, planId] = match;
  const result = await mutations.apply(planId);
  if (
    typeof result === "object" &&
    result !== null &&
    "applied" in result &&
    result.applied === false
  )
    response.statusCode = 409;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(result));
}

async function readJson(
  request: http.IncomingMessage,
): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) return undefined;
    chunks.push(chunk);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function bridgeResponse(input: {
  requestUrl: URL;
  snapshot: CompletedContentBuildSnapshot | undefined;
  server: ViteDevServer;
  options: RiebeckiteBridgeOptions;
  revision: number;
  serverId: string;
}): Record<string, unknown> {
  const { requestUrl, snapshot, server, options, revision, serverId } = input;
  const contentRoot =
    typeof options.contentRoot === "function"
      ? options.contentRoot()
      : options.contentRoot;
  const publicOrigin =
    typeof options.publicOrigin === "function"
      ? options.publicOrigin()
      : options.publicOrigin;
  const base = {
    protocolVersion: bridgeProtocolVersion,
    server: { id: serverId, version: riebeckiteVersion },
    capabilities: contentRoot
      ? [
          "status",
          "site-identity",
          "source-resolution",
          "page-resolution",
          "preview",
          "events",
          "diagnostics",
          "publication",
          "seo",
          "build-impact",
        ]
      : ["status", "page-resolution"],
    development: {
      available: true,
      revision,
      build: snapshot
        ? { status: "ready", completedAt: snapshot.completedAt }
        : { status: "unavailable" },
    },
    inspection: { available: snapshot !== undefined },
    identity: contentRoot
      ? {
          siteId:
            optionValue(options.siteId) ?? stableIdentity("site", contentRoot),
          siteName: optionValue(options.siteName) ?? "Riebeckite site",
          contentRootId:
            optionValue(options.contentRootId) ??
            stableIdentity("content-root", contentRoot),
          contentSourceKind: options.contentSourceKind ?? "integrated",
        }
      : undefined,
  };
  if (requestUrl.pathname === bridgePagePath) {
    return inspectBridgePage(snapshot, requestUrl.searchParams.get("source"), {
      revision,
      publicOrigin,
      developmentOrigin: server.resolvedUrls?.local[0],
    });
  }
  if (!contentRoot || requestUrl.pathname === bridgePath) return base;
  const inspection = {
    contentRoot,
    revision,
    developmentOrigin: server.resolvedUrls?.local[0],
    publicOrigin,
  };
  const source = requestUrl.searchParams.get("path");
  if (requestUrl.pathname === `${bridgePath}/source`)
    return resolveBridgeSource(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/preview`)
    return inspectBridgePreview(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/publication`)
    return inspectBridgePublication(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/diagnostics`)
    return inspectBridgeDiagnostics(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/impact`)
    return inspectBridgeImpact(snapshot, source, inspection);
  return base;
}

function optionValue(
  value: string | (() => string | undefined) | undefined,
): string | undefined {
  return typeof value === "function" ? value() : value;
}

function stableIdentity(kind: string, value: string): string {
  return crypto
    .createHash("sha256")
    .update(`${kind}\0${path.resolve(value)}`)
    .digest("base64url");
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
