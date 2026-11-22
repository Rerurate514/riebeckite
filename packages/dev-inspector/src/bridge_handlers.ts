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
import {
  createBridgeMutationStore,
  inspectBridgeMutationPlan,
} from "./bridge_mutation.js";
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
    ![`${bridgePath}/mutations/validate`, `${bridgePath}/mutations/plan`].some(
      (pathname) => requestUrl.pathname === pathname,
    ) &&
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
      if (requestUrl.pathname === `${bridgePath}/mutations/validate`) {
        await handleMutationValidationPost(request, response, context);
        return;
      }
      await handleMutationPost(request, response, requestUrl, context);
      return;
    }
    if (requestUrl.pathname === `${bridgePath}/events`) {
      handleEventsRequest(request, response, context, snapshot);
      return;
    }
    if (requestUrl.pathname.startsWith(`${bridgePath}/mutations/`)) {
      await handleMutationInspection(request, response, requestUrl, context);
      return;
    }
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("cache-control", "no-store");
    response.setHeader("x-content-type-options", "nosniff");
    response.end(
      JSON.stringify(
        withBridgeEvidence(
          await bridgeResponse({
            requestUrl,
            snapshot,
            server: context.server,
            options: context.options,
            revision: context.state.revision,
            serverId: context.state.serverId,
          }),
          context.state.revision,
        ),
      ),
    );
  } catch {
    response.statusCode = 503;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ code: "BRIDGE_STATUS_UNAVAILABLE" }));
  }
}

async function handleMutationValidationPost(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  context: BridgeRequestContext,
): Promise<void> {
  const { isMutationOperations, validateBridgeMutation } = await import(
    "./bridge_mutation.js"
  );
  const { readJson } = await import("./bridge_response.js");
  const body = await readJson(request);
  const contentRoot =
    typeof context.options.contentRoot === "function"
      ? context.options.contentRoot()
      : context.options.contentRoot;
  if (!body || !isMutationOperations(body.operations)) {
    response.statusCode = 400;
    response.end(JSON.stringify({ code: "INVALID_OPERATIONS" }));
    return;
  }
  if (!contentRoot) {
    response.statusCode = 503;
    response.end(JSON.stringify({ code: "BRIDGE_STATUS_UNAVAILABLE" }));
    return;
  }
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(
    JSON.stringify(
      await validateBridgeMutation(
        contentRoot,
        body.operations,
        context.options.contentFormats?.(),
        mutationPathAllowed(context),
      ),
    ),
  );
}

export async function handleMutationPost(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  requestUrl: URL,
  context: BridgeRequestContext,
): Promise<void> {
  const { options, state } = context;
  const { mutationToken, mutationApprovalToken } = options;
  if (
    !mutationEnabled(mutationToken, mutationApprovalToken) ||
    !mutationApprovalToken
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
  state.mutations ??= await createBridgeMutationStore(
    contentRoot,
    mutationApprovalToken,
    options.contentFormats?.(),
    mutationPathAllowed(context),
  );
  await bridgeMutationResponse(
    request,
    response,
    requestUrl,
    state.mutations,
    mutationToken,
  );
}

async function handleMutationInspection(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  requestUrl: URL,
  context: BridgeRequestContext,
): Promise<void> {
  const { options } = context;
  const { mutationToken, mutationApprovalToken } = options;
  const match =
    /^\/__riebeckite\/bridge\/v1\/mutations\/([0-9a-f-]{36})$/i.exec(
      requestUrl.pathname,
    );
  if (!match || !mutationEnabled(mutationToken, mutationApprovalToken)) {
    response.statusCode = 404;
    response.end();
    return;
  }
  if (
    !matchesToken(
      request.headers["x-riebeckite-bridge-mutation-token"],
      mutationToken,
    )
  ) {
    response.statusCode = 403;
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
  const inspection = await inspectBridgeMutationPlan(contentRoot, match[1]);
  if (!inspection) {
    response.statusCode = 404;
    response.end();
    return;
  }
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(
    JSON.stringify({
      ...inspection,
      revision: context.state.revision,
      evidence: [],
    }),
  );
}

function mutationPathAllowed(context: BridgeRequestContext) {
  return context.options.isMutationPathAllowed?.();
}

function withBridgeEvidence(
  value: Record<string, unknown>,
  revision: number,
): Record<string, unknown> {
  const entry = value.entry;
  const source =
    typeof entry === "object" &&
    entry !== null &&
    "source" in entry &&
    typeof entry.source === "object" &&
    entry.source !== null &&
    "path" in entry.source &&
    typeof entry.source.path === "string"
      ? { kind: "source", path: entry.source.path }
      : undefined;
  return {
    ...value,
    ...(value.revision === undefined ? { revision } : {}),
    evidence: source ? [source] : [],
  };
}

function mutationEnabled(
  mutationToken: string | undefined,
  approvalToken: string | undefined,
): mutationToken is string {
  return Boolean(
    mutationToken &&
      mutationToken.length >= 32 &&
      approvalToken &&
      approvalToken.length >= 32 &&
      mutationToken !== approvalToken,
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
      "context",
      "project",
      "schema",
      "inventory",
      "links",
      "content",
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
