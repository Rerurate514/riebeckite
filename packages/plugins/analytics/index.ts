import {
  type ContentManifestEntry,
  createClientEntry,
  definePlugin,
  escapeHtmlAttribute,
  type PostContent,
} from "@riebeckite/core";
import { ANALYTICS_CONTENT_ID_ATTRIBUTE } from "./src/init.js";
import {
  type AnalyticsOptions,
  validateAnalyticsOptions,
} from "./src/options.js";

export type {
  AnalyticsCustomEvent,
  AnalyticsEvent,
  AnalyticsPageViewEvent,
  AnalyticsTimeRange,
} from "./src/event.js";
export { ANALYTICS_CONTENT_ID_ATTRIBUTE, initAnalytics } from "./src/init.js";
export { MemoryAnalyticsProvider } from "./src/memory_provider.js";
export type { AnalyticsOptions, AnalyticsPublicConfig } from "./src/options.js";
export { validateAnalyticsOptions } from "./src/options.js";
export type { AnalyticsCapability, AnalyticsProvider } from "./src/provider.js";
export {
  ANALYTICS_CAPABILITIES,
  assertAnalyticsQuerySupported,
  requiredCapabilityForQuery,
  supportsAnalyticsCapability,
  UnsupportedAnalyticsQueryError,
} from "./src/provider.js";
export type {
  AnalyticsQuery,
  AnalyticsResult,
  ContentPageViewsQuery,
  ContentPageViewsResult,
  PopularContentItem,
  PopularContentQuery,
  PopularContentResult,
} from "./src/query.js";

/**
 * Registers browser page-view tracking for content with a stable content ID.
 * Provider runtime state remains server-side; only public collector metadata is
 * registered with the browser entry.
 */
export function analytics(options: AnalyticsOptions) {
  const tracked = new Map<string, PostContent>();
  return definePlugin({
    name: "analytics",
    options,
    validateOptions: validateAnalyticsOptions,
    clientEntries: [
      createClientEntry("analytics", "initAnalytics", options.publicConfig),
    ],
    onPostProcessed: ({ slug, content }) => {
      tracked.set(slug, content);
    },
    onManifestCreated: ({ manifest }) => {
      for (const entry of manifest.entries) {
        appendContentIdentity(entry, tracked.get(entry.slug));
      }
    },
  });
}

export const analyticsPlugin = analytics;

function appendContentIdentity(
  entry: ContentManifestEntry,
  content: PostContent | undefined,
): void {
  if (!entry.contentId) return;
  const marker = `<span hidden ${ANALYTICS_CONTENT_ID_ATTRIBUTE}="${escapeHtmlAttribute(entry.contentId)}"></span>`;
  if (!entry.html.includes(ANALYTICS_CONTENT_ID_ATTRIBUTE)) {
    entry.html = `${entry.html}\n${marker}`;
  }
  if (content && !content.html.includes(ANALYTICS_CONTENT_ID_ATTRIBUTE)) {
    content.html = `${content.html}\n${marker}`;
  }
}
