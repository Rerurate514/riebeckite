import crypto from "node:crypto";
import type http from "node:http";
import path from "node:path";
import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import type { ViteDevServer } from "vite";
import {
  bridgeMutationTokenHeader,
  bridgePagePath,
  bridgePath,
  bridgeProtocolVersion,
  riebeckiteVersion,
} from "./bridge_consts.js";
import {
  inspectBridgeDiagnostics,
  inspectBridgeImpact,
  inspectBridgePage,
  inspectBridgePreview,
  inspectBridgePublication,
  resolveBridgeSource,
} from "./bridge_inspection.js";
import type { BridgeMutationStore } from "./bridge_mutation.js";
import { isMutationOperations } from "./bridge_mutation.js";
import { matchesToken } from "./bridge_tokens.js";
import type { RiebeckiteBridgeOptions } from "./bridge_types.js";

export async function bridgeMutationResponse(
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

export async function readJson(
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

export function bridgeResponse(input: {
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

export function optionValue(
  value: string | (() => string | undefined) | undefined,
): string | undefined {
  return typeof value === "function" ? value() : value;
}

export function stableIdentity(kind: string, value: string): string {
  return crypto
    .createHash("sha256")
    .update(`${kind}\0${path.resolve(value)}`)
    .digest("base64url");
}
