import {
  type ContentManifestEntry,
  createClientEntry,
  defineEndpoint,
  definePlugin,
  escapeHtmlAttribute,
  type PostContent,
} from "@riebeckite/core";
import { ANALYTICS_MARKER, ANALYTICS_SCRIPT_PATH } from "./src/constants.js";
import {
  type AnalyticsOptions,
  validateAnalyticsOptions,
} from "./src/options.js";
import { buildAnalyticsScript } from "./src/script.js";

export { ANALYTICS_MARKER, ANALYTICS_SCRIPT_PATH } from "./src/constants.js";
export { initAnalytics } from "./src/init.js";
export type { AnalyticsOptions, AnalyticsProvider } from "./src/options.js";
export { ANALYTICS_PROVIDERS, validateAnalyticsOptions } from "./src/options.js";
export { buildAnalyticsScript } from "./src/script.js";

/**
 * Injects a provider analytics bootstrap into every page.
 *
 * The provider snippet is served from a static endpoint (`/_analytics.js` by
 * default) and loaded by the `initAnalytics` client entry. Because client
 * entries are static and receive no plugin options, the endpoint path is a
 * compile-time constant; overriding `scriptPath` requires a custom client
 * entry (see the README).
 */
export function analytics(options: AnalyticsOptions) {
  const scriptPath = options.scriptPath ?? ANALYTICS_SCRIPT_PATH;
  const tracked = new Map<string, PostContent>();

  return definePlugin({
    name: "analytics",
    options,
    validateOptions: validateAnalyticsOptions,
    endpoints: [
      defineEndpoint(
        scriptPath,
        () => ({
          headers: {
            "content-type": "application/javascript; charset=utf-8",
          },
          body: buildAnalyticsScript(options),
        }),
        { cacheControl: "public, max-age=3600" },
      ),
    ],
    clientEntries: [createClientEntry("analytics", "initAnalytics")],
    onPostProcessed: (context) => {
      tracked.set(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      const marker = buildAnalyticsMarker(scriptPath);
      for (const entry of context.manifest.entries) {
        appendAnalyticsMarker(entry, tracked.get(entry.slug), marker);
      }
    },
  });
}

/** Alias kept for symmetry with the other `*Plugin` factories. */
export const analyticsPlugin = analytics;

function buildAnalyticsMarker(scriptPath: string): string {
  const href = escapeHtmlAttribute(scriptPath);
  return [
    `<!-- ${ANALYTICS_MARKER} -->`,
    `<link rel="preload" as="script" href="${href}" />`,
    `<script defer src="${href}"></script>`,
  ].join("\n");
}

function appendAnalyticsMarker(
  entry: ContentManifestEntry,
  content: PostContent | undefined,
  marker: string,
): void {
  if (!entry.html.includes(ANALYTICS_MARKER)) {
    entry.html = `${entry.html}\n${marker}`;
  }
  // Routes render the cached `PostContent`, not the manifest entry, so both
  // views must carry the marker for it to reach the built HTML.
  if (content && !content.html.includes(ANALYTICS_MARKER)) {
    content.html = `${content.html}\n${marker}`;
  }
}
