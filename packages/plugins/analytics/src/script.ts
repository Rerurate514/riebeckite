import type { AnalyticsOptions } from "./options.js";

const PLAUSIBLE_SCRIPT_URL = "https://plausible.io/js/script.js";
const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";
const GOOGLE_ANALYTICS_SCRIPT_URL = "https://www.googletagmanager.com/gtag/js";

/**
 * Builds the JavaScript served from the analytics endpoint.
 *
 * Every configured value is JSON-encoded before it is embedded, so a value can
 * never break out of the string literal that holds it. The one exception is
 * `provider: "custom"` with a `snippet`, which is intentionally trusted and
 * returned verbatim.
 */
export function buildAnalyticsScript(options: AnalyticsOptions): string {
  switch (options.provider) {
    case "plausible":
      return buildPlausibleScript(options);
    case "umami":
      return buildUmamiScript(options);
    case "google-analytics":
      return buildGoogleAnalyticsScript(options);
    case "custom":
      return buildCustomScript(options);
    default:
      return "/* @riebeckite/plugin-analytics: unsupported provider */\n";
  }
}

function buildPlausibleScript(options: AnalyticsOptions): string {
  const domain = options.domain ?? "";
  const url = options.scriptUrl ?? PLAUSIBLE_SCRIPT_URL;
  return [
    "/* @riebeckite/plugin-analytics: plausible */",
    "(function () {",
    '  var script = document.createElement("script");',
    "  script.defer = true;",
    `  script.setAttribute("data-domain", ${jsString(domain)});`,
    `  script.src = ${jsString(url)};`,
    "  document.head.appendChild(script);",
    "})();",
    "",
  ].join("\n");
}

function buildUmamiScript(options: AnalyticsOptions): string {
  const siteId = options.siteId ?? "";
  const domain = options.domain;
  const url = options.scriptUrl ?? UMAMI_SCRIPT_URL;
  const lines = [
    "/* @riebeckite/plugin-analytics: umami */",
    "(function () {",
    '  var script = document.createElement("script");',
    "  script.defer = true;",
    `  script.setAttribute("data-website-id", ${jsString(siteId)});`,
  ];

  if (domain) {
    lines.push(`  script.setAttribute("data-domains", ${jsString(domain)});`);
  }

  lines.push(
    `  script.src = ${jsString(url)};`,
    "  document.head.appendChild(script);",
    "})();",
    "",
  );
  return lines.join("\n");
}

function buildGoogleAnalyticsScript(options: AnalyticsOptions): string {
  const measurementId = options.measurementId ?? "";
  const base = options.scriptUrl ?? GOOGLE_ANALYTICS_SCRIPT_URL;
  const source = `${base}?id=${encodeURIComponent(measurementId)}`;
  return [
    "/* @riebeckite/plugin-analytics: google-analytics */",
    "(function () {",
    `  var id = ${jsString(measurementId)};`,
    '  var script = document.createElement("script");',
    "  script.async = true;",
    `  script.src = ${jsString(source)};`,
    "  document.head.appendChild(script);",
    "  window.dataLayer = window.dataLayer || [];",
    "  function gtag() { window.dataLayer.push(arguments); }",
    "  window.gtag = gtag;",
    '  gtag("js", new Date());',
    '  gtag("config", id);',
    "})();",
    "",
  ].join("\n");
}

function buildCustomScript(options: AnalyticsOptions): string {
  if (options.snippet?.trim()) {
    return `${options.snippet.trimEnd()}\n`;
  }

  const url = options.scriptUrl ?? "";
  return [
    "/* @riebeckite/plugin-analytics: custom */",
    "(function () {",
    '  var script = document.createElement("script");',
    "  script.defer = true;",
    `  script.src = ${jsString(url)};`,
    "  document.head.appendChild(script);",
    "})();",
    "",
  ].join("\n");
}

function jsString(value: string): string {
  const encoded = JSON.stringify(value);
  return encoded === undefined ? '""' : encoded;
}
