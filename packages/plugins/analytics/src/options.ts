import type { ConfigValidationIssue } from "@riebeckite/core";
import type { AnalyticsProvider } from "./provider.js";

/** Browser-safe configuration. It must never contain provider credentials. */
export type AnalyticsPublicConfig = Readonly<{
  /** Public collector URL. The browser POSTs JSON analytics events here. */
  collectorUrl: string;
}>;

/**
 * Private provider runtime and public browser configuration are deliberately
 * separate. A provider can retain credentials, bindings, and storage handles.
 */
export type AnalyticsOptions = Readonly<{
  provider: AnalyticsProvider;
  publicConfig: AnalyticsPublicConfig;
}>;

export function validateAnalyticsOptions(
  options: AnalyticsOptions | undefined,
): readonly ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  if (!options || !isAnalyticsProvider(options.provider)) {
    issues.push({
      path: "provider",
      message: "Expected an analytics provider.",
    });
  }
  if (
    !options?.publicConfig ||
    !isCollectorUrl(options.publicConfig.collectorUrl)
  ) {
    issues.push({
      path: "publicConfig.collectorUrl",
      message:
        "Expected a site-relative path or an HTTPS URL (HTTP is allowed only for localhost).",
    });
  }
  return issues;
}

function isAnalyticsProvider(value: unknown): value is AnalyticsProvider {
  return (
    typeof value === "object" &&
    value !== null &&
    "capabilities" in value &&
    "capture" in value &&
    typeof value.capture === "function" &&
    "query" in value &&
    typeof value.query === "function"
  );
}

function isCollectorUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0
  ) {
    return false;
  }
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && isLoopbackHostname(url.hostname);
  } catch {
    return false;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host === "::1" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}
