import type {
  PluginEndpointContext,
  PluginEndpointResponse,
} from "@riebeckite/core";
import { errorResponse, jsonResponse } from "./http.js";
import {
  supportsWebmentionCapability,
  type WebmentionProvider,
} from "./provider.js";
import { findTargetEntry, isAllowedTarget } from "./targets.js";
import type { ResolvedWebmentionOptions } from "./types.js";
import { verifyWebmention } from "./verify.js";

const MAX_REQUEST_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_MAX_KEYS = 10_000;

type RateLimitBucket = {
  startedAt: number;
  count: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

type WebmentionRequestBody = Readonly<{
  source?: string;
  target?: string;
}>;

/**
 * Builds the `POST` receive handler. It validates the request, checks the
 * target belongs to the site, verifies the source actually links to it, and
 * stores the verified mention through the provider.
 */
export function createWebmentionReceiveHandler(
  options: ResolvedWebmentionOptions,
  provider: WebmentionProvider,
): (context: PluginEndpointContext) => Promise<PluginEndpointResponse> {
  return async (context) => {
    if (!supportsWebmentionCapability(provider, "store")) {
      return errorResponse(503, "storage_unavailable");
    }

    const { body, headers } = context.request;
    if (!withinRateLimit(headers)) {
      return errorResponse(429, "rate_limited", { "retry-after": "60" });
    }
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BODY_BYTES) {
      return errorResponse(413, "payload_too_large");
    }

    const params = parseWebmentionRequestBody(body, headers);
    if (params === null) return errorResponse(400, "invalid_request");

    const { source, target } = params;
    if (!source || !target) {
      return errorResponse(400, "missing_source_or_target");
    }

    const entry = findTargetEntry(context.manifest, context.config, target);
    const allowed =
      entry !== undefined ||
      isAllowedTarget(target, options.allowedTargets, context.config);
    if (!allowed) return errorResponse(400, "target_not_found");

    const verification = await verifyWebmention({
      source,
      target,
      fetchSource: options.fetchSource,
    });
    if ("reason" in verification) {
      return errorResponse(400, verification.reason);
    }

    try {
      await provider.store(verification.mention);
    } catch {
      return errorResponse(503, "storage_unavailable");
    }

    return jsonResponse(202, { status: "accepted" });
  };
}

/**
 * Parses `source`/`target` from an `application/x-www-form-urlencoded` or
 * `application/json` body. Returns `null` for malformed JSON; missing fields
 * are reported separately by the caller.
 */
function withinRateLimit(headers: Readonly<Record<string, string>>): boolean {
  const now = Date.now();
  const key = rateLimitKey(headers);
  const bucket = rateLimitBuckets.get(key);
  if (bucket === undefined || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { startedAt: now, count: 1 });
    if (rateLimitBuckets.size > RATE_LIMIT_MAX_KEYS) pruneRateLimit(now);
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

function rateLimitKey(headers: Readonly<Record<string, string>>): string {
  const value =
    headers["cf-connecting-ip"] ??
    headers["x-real-ip"] ??
    headers["x-forwarded-for"];
  const first = value?.split(",")[0]?.trim();
  return first === undefined || first === "" ? "unknown" : first;
}

function pruneRateLimit(now: number): void {
  for (const [key, bucket] of rateLimitBuckets) {
    if (now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
      rateLimitBuckets.delete(key);
    }
  }
  while (rateLimitBuckets.size > RATE_LIMIT_MAX_KEYS) {
    const oldest = rateLimitBuckets.keys().next().value;
    if (oldest === undefined) break;
    rateLimitBuckets.delete(oldest);
  }
}

export function parseWebmentionRequestBody(
  body: string,
  headers: Readonly<Record<string, string>>,
): WebmentionRequestBody | null {
  const contentType = headers["content-type"]?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    let value: unknown;
    try {
      value = JSON.parse(body);
    } catch {
      return null;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    const record = value as Record<string, unknown>;
    return {
      ...(typeof record.source === "string" ? { source: record.source } : {}),
      ...(typeof record.target === "string" ? { target: record.target } : {}),
    };
  }

  if (contentType !== "" && !contentType.includes("urlencoded")) {
    return null;
  }

  const search = new URLSearchParams(body);
  const source = search.get("source");
  const target = search.get("target");
  return {
    ...(source === null ? {} : { source }),
    ...(target === null ? {} : { target }),
  };
}
