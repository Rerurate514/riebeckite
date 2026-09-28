import {
  type ContentManifestEntry,
  createClientEntry,
  defineEndpoint,
  definePlugin,
  escapeHtmlAttribute,
  type PostContent,
} from "@riebeckite/core";
import {
  ANALYTICS_SCRIPT_ATTRIBUTE,
  ANALYTICS_SCRIPT_PATH,
} from "./src/constants.js";
import {
  type AnalyticsOptions,
  validateAnalyticsOptions,
} from "./src/options.js";
import { buildAnalyticsScript } from "./src/script.js";

export {
  ANALYTICS_SCRIPT_ATTRIBUTE,
  ANALYTICS_SCRIPT_PATH,
} from "./src/constants.js";
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
      const tags = buildAnalyticsTags(scriptPath);
      for (const entry of context.manifest.entries) {
        appendAnalyticsTags(entry, tracked.get(entry.slug), tags);
      }
    },
  });
}

/** Alias kept for symmetry with the other `*Plugin` factories. */
export const analyticsPlugin = analytics;

/**
 * Builds the tags appended to every entry: a preload hint and the bootstrap
 * `<script>`. They are real, functional output — the same `data-*` attribute
 * the client initializer queries — so the built HTML is verifiable as-is.
 */
function buildAnalyticsTags(scriptPath: string): string {
  const href = escapeHtmlAttribute(scriptPath);
  return [
    `<link rel="preload" as="script" href="${href}" />`,
    `<script defer src="${href}" ${ANALYTICS_SCRIPT_ATTRIBUTE}></script>`,
  ].join("\n");
}

function appendAnalyticsTags(
  entry: ContentManifestEntry,
  content: PostContent | undefined,
  tags: string,
): void {
  if (!entry.html.includes(ANALYTICS_SCRIPT_ATTRIBUTE)) {
    entry.html = `${entry.html}\n${tags}`;
  }
  // Routes render the cached `PostContent`, not the manifest entry, so both
  // views must carry the tags for them to reach the built HTML.
  if (content && !content.html.includes(ANALYTICS_SCRIPT_ATTRIBUTE)) {
    content.html = `${content.html}\n${tags}`;
  }
}
