import crypto from "node:crypto";
import fs from "node:fs/promises";
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
  inspectBridgeContext,
  inspectBridgeDiagnostics,
  inspectBridgeImpact,
  inspectBridgeLinks,
  inspectBridgePage,
  inspectBridgePreview,
  inspectBridgePublication,
  inspectBridgeSiteDiagnostics,
  resolveBridgeSource,
} from "./bridge_inspection.js";
import type { BridgeMutationStore } from "./bridge_mutation.js";
import { isMutationOperations } from "./bridge_mutation.js";
import { matchesToken } from "./bridge_tokens.js";
import type { RiebeckiteBridgeOptions } from "./bridge_types.js";
import { inspectContentInventory } from "./development_inspector_content.js";

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

export async function bridgeResponse(input: {
  requestUrl: URL;
  snapshot: CompletedContentBuildSnapshot | undefined;
  server: ViteDevServer;
  options: RiebeckiteBridgeOptions;
  revision: number;
  serverId: string;
}): Promise<Record<string, unknown>> {
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
          "context",
          ...(options.project ? ["project"] : []),
          "schema",
          "inventory",
          "links",
          "content",
          "mutation-validation",
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
  if (requestUrl.pathname === `${bridgePath}/project`) {
    const project = options.project?.();
    return {
      project: project
        ? {
            contentDirectory: project.contentDirectory,
            locale: project.locale,
            mutationPolicy: project.mutationPolicy,
          }
        : undefined,
      identity: base.identity,
      revision,
    };
  }
  if (requestUrl.pathname === `${bridgePath}/schema`) return bridgeSchema();
  if (requestUrl.pathname === `${bridgePath}/inventory`) {
    const inventory = inspectContentInventory(snapshot);
    const offset = boundedInteger(requestUrl.searchParams.get("offset"), 0);
    const limit = boundedInteger(
      requestUrl.searchParams.get("limit"),
      100,
      500,
    );
    const query = requestUrl.searchParams.get("query")?.toLocaleLowerCase();
    const entries = query
      ? inventory.entries.filter(
          (entry) =>
            entry.slug.toLocaleLowerCase().includes(query) ||
            entry.title.toLocaleLowerCase().includes(query),
        )
      : inventory.entries;
    return {
      ...inventory,
      entries: entries.slice(offset, offset + limit),
      page: { offset, limit, total: entries.length },
      revision,
    };
  }
  if (requestUrl.pathname === `${bridgePath}/source`)
    return resolveBridgeSource(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/preview`)
    return inspectBridgePreview(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/publication`)
    return inspectBridgePublication(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/diagnostics`)
    if (!source)
      return inspectBridgeSiteDiagnostics(
        snapshot,
        inspection,
        requestUrl.searchParams.get("since"),
      );
  if (requestUrl.pathname === `${bridgePath}/diagnostics`)
    return inspectBridgeDiagnostics(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/impact`)
    return inspectBridgeImpact(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/context`)
    return inspectBridgeContext(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/links`)
    return inspectBridgeLinks(snapshot, source, inspection);
  if (requestUrl.pathname === `${bridgePath}/content`)
    return readBridgeContent(snapshot, source, inspection);
  return base;
}

export function boundedInteger(
  input: string | null,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const value = Number(input);
  return Number.isInteger(value) && value >= 0
    ? Math.min(value, maximum)
    : fallback;
}

export function bridgeSchema(): Record<string, unknown> {
  return {
    protocolVersion: bridgeProtocolVersion,
    endpoints: {
      inventory: {
        query: { offset: "integer", limit: "integer", query: "string" },
      },
      diagnostics: { query: { path: "string", since: "revision" } },
      links: { query: { path: "string" } },
      content: { query: { path: "string" } },
      project: { method: "GET" },
      impact: { query: { path: "string" } },
      "mutations/validate": {
        method: "POST",
        body: { operations: "ContentMutationOperation[]" },
      },
      "mutations/{planId}": { method: "GET", authentication: "mutation" },
    },
  };
}

export async function readBridgeContent(
  snapshot: CompletedContentBuildSnapshot | undefined,
  source: string | null,
  inspection: {
    contentRoot: string;
    revision: number;
  },
): Promise<Record<string, unknown>> {
  const resolved = resolveBridgeSource(snapshot, source, inspection);
  if (resolved.status !== "resolved") return resolved;
  const entry = resolved.entry as { source: { path: string } };
  try {
    const root = await fs.realpath(inspection.contentRoot);
    const target = await fs.realpath(path.resolve(root, entry.source.path));
    const relative = path.relative(root, target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
      return { ...resolved, content: { available: false } };
    const stat = await fs.stat(target);
    if (!stat.isFile() || stat.size > 1024 * 1024)
      return { ...resolved, content: { available: false } };
    return {
      ...resolved,
      content: { available: true, text: await fs.readFile(target, "utf8") },
    };
  } catch {
    return { ...resolved, content: { available: false } };
  }
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
