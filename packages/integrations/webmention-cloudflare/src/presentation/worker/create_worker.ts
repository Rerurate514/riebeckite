import {
  createWebmentionSourceFetcher,
  parseWebmentionRequestBody,
  UnsupportedWebmentionQueryError,
  urlComparisonKey,
  verifyWebmention,
  type WebmentionMention,
  type WebmentionSourceFetcher,
} from "@riebeckite/plugin-webmention";
import type { WebmentionStorage } from "../../domain/webmention/storage.js";

const MAX_REQUEST_BODY_BYTES = 64 * 1024;
const DEFAULT_FEED_LIMIT = 50;

export type WebmentionCorsOptions = Readonly<{
  /** Explicit browser origins, or "any". Browser clients are not typical. */
  allowedOrigins?: readonly string[] | "any";
  /**
   * Allow requests without an `Origin` header. Defaults to `true` because
   * Webmention senders are servers, not browsers.
   */
  allowMissingOrigin?: boolean;
}>;

export type WebmentionWorkerOptions = Readonly<{
  /** One explicitly selected runtime storage adapter. */
  storage: WebmentionStorage;
  /** Absolute target URLs accepted by this receiver. No default. */
  allowedTargets: readonly string[];
  /** Source fetcher override, mainly for tests. */
  fetchSource?: WebmentionSourceFetcher;
  cors?: WebmentionCorsOptions;
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
  allowPrivateHosts?: boolean;
}>;

export type WebmentionWorker = Readonly<{
  fetch(request: Request): Promise<Response>;
}>;

/**
 * Creates a standalone Webmention receiver. It verifies sources, stores them
 * through the selected adapter, and serves a verified-mention feed. It does
 * not render articles or know about the content manifest; feed entries carry
 * no article summary. When the receiver shares the site Worker, prefer the
 * plugin's `endpoints` so mentions can be matched to published entries.
 */
export function createWorker(
  options: WebmentionWorkerOptions,
): WebmentionWorker {
  const fetchSource =
    options.fetchSource ??
    createWebmentionSourceFetcher({
      timeoutMs: options.timeoutMs,
      maxBytes: options.maxBytes,
      userAgent: options.userAgent,
      allowPrivateHosts: options.allowPrivateHosts,
    });
  const allowedTargets = new Set(
    options.allowedTargets.map((target) => urlComparisonKey(target)),
  );

  return {
    async fetch(request): Promise<Response> {
      const originResponse = corsResponse(request, options.cors);
      if (originResponse) return originResponse;
      const corsHeaders = responseCorsHeaders(request, options.cors);
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      const url = new URL(request.url);
      if (url.pathname !== "/webmentions") {
        return json({ error: "not_found" }, 404, corsHeaders);
      }
      if (request.method === "POST") {
        return receive(
          request,
          options.storage,
          allowedTargets,
          fetchSource,
          corsHeaders,
        );
      }
      if (request.method === "GET") {
        return feed(url, options.storage, corsHeaders);
      }
      return json({ error: "method_not_allowed" }, 405, corsHeaders);
    },
  };
}

async function receive(
  request: Request,
  storage: WebmentionStorage,
  allowedTargets: ReadonlySet<string>,
  fetchSource: WebmentionSourceFetcher,
  headers: Headers,
): Promise<Response> {
  if (!storage.capabilities.has("store")) {
    return json({ error: "storage_unavailable" }, 503, headers);
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_REQUEST_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413, headers);
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413, headers);
  }

  const requestHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    requestHeaders[key.toLowerCase()] = value;
  });
  const params = parseWebmentionRequestBody(body, requestHeaders);
  if (params === null) return json({ error: "invalid_request" }, 400, headers);

  const { source, target } = params;
  if (!source || !target) {
    return json({ error: "missing_source_or_target" }, 400, headers);
  }
  if (!allowedTargets.has(urlComparisonKey(target))) {
    return json({ error: "target_not_found" }, 400, headers);
  }

  const verification = await verifyWebmention({ source, target, fetchSource });
  if ("reason" in verification) {
    return json({ error: verification.reason }, 400, headers);
  }
  try {
    await storage.store(verification.mention);
  } catch {
    return json({ error: "storage_unavailable" }, 503, headers);
  }
  return json({ status: "accepted" }, 202, headers);
}

async function feed(
  url: URL,
  storage: WebmentionStorage,
  headers: Headers,
): Promise<Response> {
  if (!storage.capabilities.has("query")) {
    return json({ error: "unsupported_query" }, 501, headers);
  }
  const target = url.searchParams.get("target");
  const limit = parseLimit(url.searchParams.get("limit"));
  const since = url.searchParams.get("since") ?? undefined;

  let mentions: readonly WebmentionMention[];
  try {
    if (target !== null && target !== "") {
      const result = await storage.query({
        type: "mentions_for_target",
        target,
        limit,
      });
      mentions = result.mentions;
    } else {
      const result = await storage.query({
        type: "all_mentions",
        limit,
        since,
      });
      mentions = result.mentions;
    }
  } catch (error) {
    if (error instanceof UnsupportedWebmentionQueryError) {
      return json({ error: "unsupported_query" }, 501, headers);
    }
    return json({ error: "storage_unavailable" }, 503, headers);
  }

  return json(
    {
      version: "1",
      generatedAt: new Date().toISOString(),
      count: mentions.length,
      mentions,
    },
    200,
    headers,
  );
}

function parseLimit(value: string | null): number {
  if (value === null || value.trim() === "") return DEFAULT_FEED_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    return DEFAULT_FEED_LIMIT;
  }
  return parsed;
}

function corsResponse(
  request: Request,
  cors: WebmentionCorsOptions | undefined,
): Response | undefined {
  const origin = request.headers.get("origin");
  if (origin === null) {
    return cors?.allowMissingOrigin === false
      ? json({ error: "origin_required" }, 403)
      : undefined;
  }
  const allowed = cors?.allowedOrigins;
  const originAllowed =
    allowed === "any" || (Array.isArray(allowed) && allowed.includes(origin));
  if (!originAllowed) return json({ error: "origin_not_allowed" }, 403);
  return undefined;
}

function responseCorsHeaders(
  request: Request,
  cors: WebmentionCorsOptions | undefined,
): Headers {
  const headers = new Headers({ Vary: "Origin" });
  const origin = request.headers.get("origin");
  if (
    origin &&
    (cors?.allowedOrigins === "any" || cors?.allowedOrigins?.includes(origin))
  ) {
    headers.set(
      "Access-Control-Allow-Origin",
      cors.allowedOrigins === "any" ? "*" : origin,
    );
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return headers;
}

function json(
  value: unknown,
  status: number,
  headers = new Headers(),
): Response {
  const output = new Headers(headers);
  output.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(value), { status, headers: output });
}
