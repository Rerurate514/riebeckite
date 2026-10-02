import { createStyleAsset, definePlugin } from "@riebeckite/core";
import {
  buildWebmentionDiagnostics,
  WEBMENTION_PLUGIN_NAME,
} from "./src/diagnostics.js";
import { createWebmentionEndpoints } from "./src/endpoints.js";
import type { WebmentionMention } from "./src/mention.js";
import {
  resolveWebmentionOptions,
  validateWebmentionOptions,
} from "./src/options.js";
import { supportsWebmentionCapability } from "./src/provider.js";
import { renderWebmentionSection, WEBMENTION_ATTRIBUTE } from "./src/render.js";
import { countUnmatchedMentions, groupMentionsBySlug } from "./src/server.js";
import type { WebmentionOptions } from "./src/types.js";

export { createWebmentionEndpoints } from "./src/endpoints.js";
export type {
  WebmentionFeed,
  WebmentionFeedEntry,
  WebmentionFeedMention,
} from "./src/feed.js";
export {
  buildFeed,
  createWebmentionFeedHandler,
  summarizeEntry,
} from "./src/feed.js";
export { MemoryWebmentionProvider } from "./src/memory_provider.js";
export type {
  WebmentionAuthor,
  WebmentionMention,
  WebmentionType,
} from "./src/mention.js";
export { WEBMENTION_TYPES, webmentionKey } from "./src/mention.js";
export {
  DEFAULT_WEBMENTION_CLASS_NAME,
  DEFAULT_WEBMENTION_ENDPOINT,
  DEFAULT_WEBMENTION_HEADING_TEXT,
  DEFAULT_WEBMENTION_LIMIT,
  resolveWebmentionOptions,
  validateWebmentionOptions,
} from "./src/options.js";
export type {
  ParsedWebmentionLink,
  ParsedWebmentionSource,
} from "./src/parse.js";
export {
  findTargetLink,
  parseWebmentionSource,
  webmentionTypeForRels,
} from "./src/parse.js";
export type {
  WebmentionCapability,
  WebmentionProvider,
} from "./src/provider.js";
export {
  assertWebmentionQuerySupported,
  requiredCapabilityForQuery,
  supportsWebmentionCapability,
  UnsupportedWebmentionQueryError,
  WEBMENTION_CAPABILITIES,
} from "./src/provider.js";
export type {
  AllMentionsQuery,
  AllMentionsResult,
  MentionsForTargetQuery,
  MentionsForTargetResult,
  WebmentionQuery,
  WebmentionQueryResult,
} from "./src/query.js";
export {
  createWebmentionReceiveHandler,
  parseWebmentionRequestBody,
} from "./src/receive.js";
export {
  renderWebmentionItem,
  renderWebmentionSection,
  WEBMENTION_ATTRIBUTE,
} from "./src/render.js";
export {
  compareMentions,
  countUnmatchedMentions,
  getWebmentionsForEntry,
  groupMentionsBySlug,
} from "./src/server.js";
export {
  entryPublicUrl,
  findTargetEntry,
  isAllowedTarget,
} from "./src/targets.js";
export type {
  ResolvedWebmentionOptions,
  WebmentionOptions,
} from "./src/types.js";
export {
  normalizeWebmentionUrl,
  resolvePublicUrl,
  urlComparisonKey,
} from "./src/url.js";
export type {
  WebmentionRejectionReason,
  WebmentionSourceDocument,
  WebmentionSourceFetcher,
  WebmentionSourceFetcherOptions,
  WebmentionVerification,
} from "./src/verify.js";
export {
  createWebmentionSourceFetcher,
  DEFAULT_WEBMENTION_MAX_BYTES,
  DEFAULT_WEBMENTION_TIMEOUT_MS,
  DEFAULT_WEBMENTION_USER_AGENT,
  verifyWebmention,
} from "./src/verify.js";

export type { WebmentionOptions as WebmentionPluginOptions };

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const webmentionPlugin = webmention;

/**
 * Receives Webmentions and displays verified ones as "mentions" near articles.
 *
 * The plugin is storage- and vendor-agnostic: it defines the
 * `WebmentionProvider` seam and ships an in-memory provider for local use. A
 * runtime adapter (for example `@riebeckite/webmention-cloudflare`) supplies
 * durable storage.
 *
 * It declares `endpoints` for `POST` (receive) and `GET` (feed) on the
 * configured path; the HonoX integration mounts them on the host router. No
 * framework or application code is imported here.
 */
export function webmention(options: WebmentionOptions = {}) {
  const resolved = resolveWebmentionOptions(options);
  const provider = resolved.provider;

  return definePlugin({
    name: WEBMENTION_PLUGIN_NAME,
    processedContentCache: {
      version: "webmention-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateWebmentionOptions,
    onManifestCreated: async (context) => {
      if (
        !resolved.render ||
        !supportsWebmentionCapability(provider, "query")
      ) {
        return;
      }

      let mentions: readonly WebmentionMention[];
      try {
        const result = await provider.query({ type: "all_mentions" });
        mentions = result.mentions;
      } catch (error) {
        context.diagnostics.push({
          code: "webmention-query-failed",
          severity: "warning",
          pluginName: WEBMENTION_PLUGIN_NAME,
          message:
            "The webmention provider could not be queried, so mentions were not rendered.",
          meta: {
            cause: error instanceof Error ? error.message : String(error),
          },
        });
        return;
      }

      const grouped = groupMentionsBySlug(
        context.manifest,
        context.config,
        mentions,
      );
      for (const [slug, list] of grouped) {
        const entry = context.manifest.bySlug.get(slug);
        if (!entry || entry.html.includes(WEBMENTION_ATTRIBUTE)) continue;
        const section = renderWebmentionSection(
          list.slice(0, resolved.limit),
          resolved,
        );
        if (section === "") continue;
        entry.html = `${entry.html}${section}`;
      }

      const unmatched = countUnmatchedMentions(
        context.manifest,
        context.config,
        mentions,
      );
      if (unmatched > 0) {
        context.diagnostics.push({
          code: "webmention-unmatched-target",
          severity: "info",
          pluginName: WEBMENTION_PLUGIN_NAME,
          message: `${unmatched} verified webmention(s) target a URL that is not a published entry and were not rendered.`,
        });
      }
    },
    endpoints: createWebmentionEndpoints(resolved),
    assets: [createStyleAsset(WEBMENTION_PLUGIN_NAME)],
    addDiagnostics: () => buildWebmentionDiagnostics(provider, resolved),
  });
}

export { buildWebmentionDiagnostics };
