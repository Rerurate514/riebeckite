import type { AnalyticsEvent } from "@riebeckite/plugin-analytics";
import type { AnalyticsStorage } from "../../domain/analytics/storage.js";

const MAX_BODY_BYTES = 8_192;
const MAX_CONTENT_ID_LENGTH = 160;
const MAX_PATH_LENGTH = 512;
const MAX_LANG_LENGTH = 35;

export type AnalyticsCorsOptions = Readonly<{
  /** Explicit browser origins, or "any" for a deliberately public collector. */
  allowedOrigins?: readonly string[] | "any";
  /** Allows non-browser clients that do not send Origin. Defaults to false. */
  allowMissingOrigin?: boolean;
}>;

export type AnalyticsWorkerOptions = Readonly<{
  /** One explicitly selected runtime storage adapter. No default is provided. */
  storage: AnalyticsStorage;
  cors?: AnalyticsCorsOptions;
}>;

export type AnalyticsWorker = Readonly<{
  fetch(request: Request): Promise<Response>;
}>;

/** Creates a standalone analytics Worker; it does not serve static site assets. */
export function createWorker(options: AnalyticsWorkerOptions): AnalyticsWorker {
  return {
    async fetch(request): Promise<Response> {
      const originResponse = corsResponse(request, options.cors);
      if (originResponse) return originResponse;
      const corsHeaders = responseCorsHeaders(request, options.cors);
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      const url = new URL(request.url);
      if (request.method === "POST" && url.pathname === "/events") {
        return captureEvent(request, options.storage, corsHeaders);
      }
      if (request.method === "GET" && url.pathname === "/popular") {
        return queryPopular(url, options.storage, corsHeaders);
      }
      const contentMatch = /^\/content\/([^/]+)\/page-views$/.exec(
        url.pathname,
      );
      if (request.method === "GET" && contentMatch) {
        return queryContent(contentMatch[1], url, options.storage, corsHeaders);
      }
      return json({ error: "not_found" }, 404, corsHeaders);
    },
  };
}

async function captureEvent(
  request: Request,
  storage: AnalyticsStorage,
  headers: Headers,
): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "unsupported_media_type" }, 415, headers);
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413, headers);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413, headers);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return json({ error: "invalid_json" }, 400, headers);
  }
  const event = validateEvent(value);
  if (!event) return json({ error: "invalid_event" }, 400, headers);
  await storage.capture(event);
  return new Response(null, { status: 204, headers });
}

async function queryContent(
  contentId: string,
  url: URL,
  storage: AnalyticsStorage,
  headers: Headers,
): Promise<Response> {
  if (!isContentId(contentId))
    return json({ error: "invalid_content_id" }, 400, headers);
  const timeRange = parseTimeRange(url);
  if (timeRange === null)
    return json({ error: "invalid_time_range" }, 400, headers);
  try {
    return json(
      await storage.query({
        type: "content_page_views",
        contentId,
        timeRange: timeRange ?? undefined,
      }),
      200,
      headers,
    );
  } catch (error) {
    return queryError(error, headers);
  }
}

async function queryPopular(
  url: URL,
  storage: AnalyticsStorage,
  headers: Headers,
): Promise<Response> {
  const timeRange = parseTimeRange(url);
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit === null ? undefined : Number(rawLimit);
  if (
    timeRange === null ||
    (limit !== undefined &&
      (!Number.isInteger(limit) || limit < 1 || limit > 100))
  ) {
    return json({ error: "invalid_query" }, 400, headers);
  }
  try {
    return json(
      await storage.query({
        type: "popular_content",
        limit,
        timeRange: timeRange ?? undefined,
      }),
      200,
      headers,
    );
  } catch (error) {
    return queryError(error, headers);
  }
}

function validateEvent(value: unknown): AnalyticsEvent | undefined {
  if (!isRecord(value) || value.type !== "page_view") return undefined;
  if (!isContentId(value.contentId) || !isIsoDate(value.occurredAt))
    return undefined;
  if (
    value.path !== undefined &&
    (!isSafeString(value.path, MAX_PATH_LENGTH) || !value.path.startsWith("/"))
  )
    return undefined;
  if (value.lang !== undefined && !isSafeString(value.lang, MAX_LANG_LENGTH))
    return undefined;
  if (
    Object.keys(value).some(
      (key) =>
        !["type", "contentId", "occurredAt", "path", "lang"].includes(key),
    )
  )
    return undefined;
  return {
    type: "page_view",
    contentId: value.contentId,
    occurredAt: value.occurredAt,
    ...(value.path === undefined ? {} : { path: value.path }),
    ...(value.lang === undefined ? {} : { lang: value.lang }),
  };
}

function parseTimeRange(
  url: URL,
): { from?: string; to?: string } | null | undefined {
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  if (
    (from && !isIsoDate(from)) ||
    (to && !isIsoDate(to)) ||
    (from && to && from > to)
  )
    return null;
  return from || to ? { from, to } : undefined;
}

function corsResponse(
  request: Request,
  cors: AnalyticsCorsOptions | undefined,
): Response | undefined {
  const origin = request.headers.get("origin");
  const allowed = cors?.allowedOrigins;
  const originAllowed =
    origin !== null &&
    (allowed === "any" || (Array.isArray(allowed) && allowed.includes(origin)));
  if (origin !== null && !originAllowed)
    return json({ error: "origin_not_allowed" }, 403);
  if (origin === null && !cors?.allowMissingOrigin)
    return json({ error: "origin_required" }, 403);
  return undefined;
}

function responseCorsHeaders(
  request: Request,
  cors: AnalyticsCorsOptions | undefined,
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

function queryError(error: unknown, headers: Headers): Response {
  if (
    error instanceof Error &&
    error.name === "UnsupportedAnalyticsQueryError"
  ) {
    return json(
      { error: "unsupported_query", message: error.message },
      501,
      headers,
    );
  }
  return json({ error: "storage_unavailable" }, 503, headers);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeString(value: unknown, length: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= length &&
    [...value].every((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
  );
}

function isContentId(value: unknown): value is string {
  return isSafeString(value, MAX_CONTENT_ID_LENGTH) && value.trim() === value;
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 40 &&
    !Number.isNaN(Date.parse(value))
  );
}
