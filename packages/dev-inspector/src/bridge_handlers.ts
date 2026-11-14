import type http from "node:http";
import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import type { ViteDevServer } from "vite";
import {
  bridgePagePath,
  bridgePath,
  bridgeProtocolHeader,
  bridgeProtocolVersion,
  bridgeTokenHeader,
  invalidators,
} from "./bridge_consts.js";
import { createBridgeMutationStore } from "./bridge_mutation.js";
import { bridgeMutationResponse, bridgeResponse } from "./bridge_response.js";
import { matchesToken } from "./bridge_tokens.js";
import type {
  BridgeRequestContext,
  BridgeServerState,
} from "./bridge_types.js";
import {
  isLoopbackAddress,
  isLoopbackHost,
  isTrustedInspectorRequest,
} from "./development_inspector_security.js";

export function rejectBridgeRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  requestUrl: URL,
  token: string,
): boolean {
  if (!isTrustedBridgeRequest(request, token)) {
    response.statusCode = 403;
    response.end();
    return true;
  }
  if (request.method !== "GET" && request.method !== "POST") {
    response.statusCode = 405;
    response.end();
    return true;
  }
  if (!isBridgePath(requestUrl.pathname)) {
    response.statusCode = 404;
    response.end();
    return true;
  }
  if (
    request.method === "POST" &&
    !requestUrl.pathname.startsWith(`${bridgePath}/mutations/`)
  ) {
    response.statusCode = 405;
    response.end();
    return true;
  }
  if (request.headers[bridgeProtocolHeader] !== `${bridgeProtocolVersion}`) {
    response.statusCode = 426;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({
        code: "INCOMPATIBLE_PROTOCOL",
        supportedProtocolVersions: [bridgeProtocolVersion],
      }),
    );
    return true;
  }
  return false;
}

export async function handleBridgeRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  context: BridgeRequestContext,
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  if (rejectBridgeRequest(request, response, requestUrl, context.token)) return;
  try {
    const snapshot = await context.options.getSnapshot(context.server);
    if (request.method === "POST") {
      await handleMutationPost(request, response, requestUrl, context);
      return;
    }
    if (requestUrl.pathname === `${bridgePath}/events`) {
      handleEventsRequest(request, response, context, snapshot);
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
          server: context.server,
          options: context.options,
          revision: context.state.revision,
          serverId: context.state.serverId,
        }),
      ),
    );
  } catch {
    response.statusCode = 503;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ code: "BRIDGE_STATUS_UNAVAILABLE" }));
  }
}

export async function handleMutationPost(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  requestUrl: URL,
  context: BridgeRequestContext,
): Promise<void> {
  const { options, state } = context;
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
    response.end(JSON.stringify({ code: "BRIDGE_STATUS_UNAVAILABLE" }));
    return;
  }
  state.mutations ??= createBridgeMutationStore(
    contentRoot,
    options.mutationApprovalToken,
    options.contentFormats?.(),
  );
  await bridgeMutationResponse(
    request,
    response,
    requestUrl,
    state.mutations,
    options.mutationToken,
  );
}

export function handleEventsRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  context: BridgeRequestContext,
  snapshot: CompletedContentBuildSnapshot | undefined,
): void {
  const { state } = context;
  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive",
    "x-content-type-options": "nosniff",
  });
  response.write(
    `event: state\ndata: ${JSON.stringify({ revision: state.revision, build: snapshot ? "ready" : "unavailable" })}\n\n`,
  );
  state.eventClients.add(response);
  request.once("close", () => state.eventClients.delete(response));
}

export function createBootstrapHandler(
  server: ViteDevServer,
  token: string,
  privateServer: http.Server,
  privateReady: Promise<void>,
) {
  return async (
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
}

export function invalidateBridgeClients(state: BridgeServerState): void {
  state.revision += 1;
  for (const client of state.eventClients) {
    client.write(
      `event: content.changed\ndata: ${JSON.stringify({ revision: state.revision })}\n\n`,
    );
  }
}

export function closeBridgeServer(
  server: ViteDevServer,
  state: BridgeServerState,
  privateServer: http.Server,
): void {
  invalidators.delete(server);
  for (const client of state.eventClients) client.end();
  state.eventClients.clear();
  privateServer.close();
}

export function isBridgePath(pathname: string): boolean {
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

export function isTrustedBridgeRequest(
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
