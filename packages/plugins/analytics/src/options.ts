import type { ConfigValidationIssue } from "@riebeckite/core";

/** Analytics providers supported by the built-in bootstrap. */
export const ANALYTICS_PROVIDERS = [
  "plausible",
  "umami",
  "google-analytics",
  "custom",
] as const;

export type AnalyticsProvider = (typeof ANALYTICS_PROVIDERS)[number];

export type AnalyticsOptions = {
  /** Provider whose bootstrap is served. */
  provider: AnalyticsProvider;
  /** Plausible domain, or optional Umami `data-domains` value. */
  domain?: string;
  /** Umami website id (`data-website-id`). */
  siteId?: string;
  /** Google Analytics measurement id (`G-XXXXXXX`). */
  measurementId?: string;
  /**
   * Overrides the provider's default script URL. For `provider: "custom"` this
   * is the script URL loaded when no `snippet` is given.
   */
  scriptUrl?: string;
  /**
   * Raw bootstrap JavaScript for `provider: "custom"`. This value is trusted:
   * it is served verbatim from the endpoint. Do not build it from untrusted
   * input.
   */
  snippet?: string;
  /**
   * Endpoint and client script path. Defaults to `ANALYTICS_SCRIPT_PATH`
   * (`/_analytics.js`). The built-in client entry always uses the default, so
   * changing this requires a matching custom client entry.
   */
  scriptPath?: string;
};

export function validateAnalyticsOptions(
  options: AnalyticsOptions | undefined,
): readonly ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];

  if (!options) {
    issues.push({ path: "provider", message: providerMessage() });
    return issues;
  }

  if (!isProvider(options.provider)) {
    issues.push({ path: "provider", message: providerMessage() });
  }

  validateOptionalString(options.domain, "domain", issues);
  validateOptionalString(options.siteId, "siteId", issues);
  validateOptionalString(options.measurementId, "measurementId", issues);
  validateOptionalString(options.scriptUrl, "scriptUrl", issues);
  validateOptionalString(options.snippet, "snippet", issues);

  if (options.provider === "plausible" && !hasText(options.domain)) {
    issues.push({ path: "domain", message: "Plausible requires a domain." });
  }
  if (options.provider === "umami" && !hasText(options.siteId)) {
    issues.push({ path: "siteId", message: "Umami requires a site id." });
  }
  if (
    options.provider === "google-analytics" &&
    !hasText(options.measurementId)
  ) {
    issues.push({
      path: "measurementId",
      message: "google-analytics requires a measurement id.",
    });
  }
  if (
    options.provider === "custom" &&
    !hasText(options.snippet) &&
    !hasText(options.scriptUrl)
  ) {
    issues.push({
      path: "snippet",
      message: "custom requires a snippet or a scriptUrl.",
    });
  }
  if (options.scriptPath !== undefined && !isStaticPath(options.scriptPath)) {
    issues.push({
      path: "scriptPath",
      message: 'Expected a static path starting with "/".',
    });
  }

  return issues;
}

function isProvider(value: unknown): value is AnalyticsProvider {
  return (
    typeof value === "string" &&
    (ANALYTICS_PROVIDERS as readonly string[]).includes(value)
  );
}

function providerMessage(): string {
  return `Expected one of: ${ANALYTICS_PROVIDERS.join(", ")}.`;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateOptionalString(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (value !== undefined && typeof value !== "string") {
    issues.push({ path, message: "Expected a string." });
  }
}

function isStaticPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    value.length > 1 &&
    !/[\s?#:]/.test(value) &&
    !value.includes("//") &&
    value !== "/assets" &&
    !value.startsWith("/assets/")
  );
}
