import type { ConfigValidationIssue } from "@riebeckite/core";
import { MemoryWebmentionProvider } from "./memory_provider.js";
import type { WebmentionProvider } from "./provider.js";
import type { ResolvedWebmentionOptions, WebmentionOptions } from "./types.js";
import { createWebmentionSourceFetcher } from "./verify.js";

export const DEFAULT_WEBMENTION_ENDPOINT = "/webmentions";
export const DEFAULT_WEBMENTION_HEADING_TEXT = "Mentions";
export const DEFAULT_WEBMENTION_LIMIT = 20;
export const DEFAULT_WEBMENTION_CLASS_NAME = "rr-webmention";

/**
 * Applies defaults and creates the default source fetcher. Pure with respect
 * to the filesystem; the only side effect is constructing a fetcher closure.
 */
export function resolveWebmentionOptions(
  options: WebmentionOptions = {},
): ResolvedWebmentionOptions {
  return {
    provider: options.provider ?? new MemoryWebmentionProvider(),
    endpoint: normalizeEndpoint(options.endpoint),
    render: options.render ?? true,
    headingText: normalizeText(
      options.headingText,
      DEFAULT_WEBMENTION_HEADING_TEXT,
    ),
    limit: normalizeLimit(options.limit),
    className: normalizeText(options.className, DEFAULT_WEBMENTION_CLASS_NAME),
    allowedTargets: options.allowedTargets ?? [],
    fetchSource:
      options.fetchSource ??
      createWebmentionSourceFetcher({
        timeoutMs: options.timeoutMs,
        maxBytes: options.maxBytes,
        userAgent: options.userAgent,
        allowPrivateHosts: options.allowPrivateHosts,
      }),
    nofollow: options.nofollow ?? true,
  };
}

export function validateWebmentionOptions(
  options: WebmentionOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];

  if (
    options.provider !== undefined &&
    !isWebmentionProvider(options.provider)
  ) {
    issues.push({
      path: "provider",
      message:
        "Expected a webmention provider with capabilities, store, and query.",
    });
  }

  if (options.endpoint !== undefined && !isEndpointPath(options.endpoint)) {
    issues.push({
      path: "endpoint",
      message:
        'Expected a site-relative path starting with "/" without query, hash, or whitespace.',
    });
  }

  for (const key of ["headingText", "className", "userAgent"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  if (options.limit !== undefined && !isNonNegativeInteger(options.limit)) {
    issues.push({
      path: "limit",
      message: "Expected a non-negative integer.",
    });
  }

  if (
    options.timeoutMs !== undefined &&
    !isPositiveInteger(options.timeoutMs)
  ) {
    issues.push({
      path: "timeoutMs",
      message: "Expected a positive integer.",
    });
  }

  if (options.maxBytes !== undefined && !isPositiveInteger(options.maxBytes)) {
    issues.push({
      path: "maxBytes",
      message: "Expected a positive integer.",
    });
  }

  for (const key of ["render", "nofollow", "allowPrivateHosts"] as const) {
    const value = options[key];
    if (value !== undefined && typeof value !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }

  if (
    options.fetchSource !== undefined &&
    typeof options.fetchSource !== "function"
  ) {
    issues.push({
      path: "fetchSource",
      message: "Expected a source fetcher function.",
    });
  }

  if (options.allowedTargets !== undefined) {
    if (!Array.isArray(options.allowedTargets)) {
      issues.push({
        path: "allowedTargets",
        message: "Expected an array of absolute http(s) URLs.",
      });
    } else {
      options.allowedTargets.forEach((target, index) => {
        if (!isAbsoluteHttpUrl(target)) {
          issues.push({
            path: `allowedTargets.${index}`,
            message: "Expected an absolute http(s) URL.",
          });
        }
      });
    }
  }

  return issues;
}

function isWebmentionProvider(value: unknown): value is WebmentionProvider {
  return (
    typeof value === "object" &&
    value !== null &&
    "capabilities" in value &&
    "store" in value &&
    typeof value.store === "function" &&
    "query" in value &&
    typeof value.query === "function"
  );
}

function normalizeEndpoint(value: string | undefined): string {
  if (value === undefined) return DEFAULT_WEBMENTION_ENDPOINT;
  const trimmed = value.trim();
  if (!isEndpointPath(trimmed)) return DEFAULT_WEBMENTION_ENDPOINT;
  return trimmed === "/"
    ? DEFAULT_WEBMENTION_ENDPOINT
    : trimmed.replace(/\/$/, "");
}

function isEndpointPath(value: string): boolean {
  if (typeof value !== "string" || !value.startsWith("/")) return false;
  if (value.length < 2) return false;
  if (value.includes("?") || value.includes("#")) return false;
  if (/\s/.test(value) || value.includes("//")) return false;
  if (value === "/assets" || value.startsWith("/assets/")) return false;
  return true;
}

function normalizeText(value: string | undefined, fallback: string): string {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  return value.trim();
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined || !isNonNegativeInteger(value)) {
    return DEFAULT_WEBMENTION_LIMIT;
  }
  return value;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isAbsoluteHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
