import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
  type PostContent,
} from "@riebeckite/core";
import { resolveRelatedPostsOptions } from "./src/options.js";
import { buildRelatedPosts, isEligibleRelatedEntry } from "./src/related.js";
import { RELATED_POSTS_ATTRIBUTE, renderRelatedPosts } from "./src/render.js";
import type { RelatedPostsOptions } from "./src/types.js";

export { resolveRelatedPostsOptions } from "./src/options.js";
export {
  buildRelatedPosts,
  CO_CITATION_WEIGHT,
  DIRECT_LINK_WEIGHT,
  isEligibleRelatedEntry,
  SHARED_TAG_WEIGHT,
} from "./src/related.js";
export {
  RELATED_POSTS_ATTRIBUTE,
  renderRelatedPosts,
} from "./src/render.js";
export type {
  RelatedPostsEntry,
  RelatedPostsOptions,
  ResolvedRelatedPostsOptions,
} from "./src/types.js";

export const RELATED_POSTS_PLUGIN_NAME = "related-posts";

/**
 * Build-time "related notes" navigation.
 *
 * For every published entry it ranks the other entries in the manifest, then
 * appends a `<nav>` section to both `entry.html` and the cached
 * `PostContent.html` that the content route renders. No client runtime is
 * required.
 */
export function relatedPosts(options: RelatedPostsOptions = {}) {
  const resolved = resolveRelatedPostsOptions(options);
  const processed = new Map<string, PostContent>();

  return definePlugin({
    name: RELATED_POSTS_PLUGIN_NAME,
    processedContentCache: {
      version: "related-posts-v1",
      dependencyMode: "unsafe",
    },
    options,
    validateOptions: validateRelatedPostsOptions,
    onPostProcessed: (context) => {
      processed.set(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      const { manifest } = context;
      for (const entry of manifest.discoverableEntries) {
        if (entry.html.includes(RELATED_POSTS_ATTRIBUTE)) continue;
        if (!isEligibleRelatedEntry(entry, manifest, context.config)) continue;

        const related = buildRelatedPosts({
          manifest,
          entry,
          options: resolved,
          config: context.config,
        });
        if (related.length === 0) continue;

        entry.html = `${entry.html}${renderRelatedPosts(related, resolved)}`;
        const content = processed.get(entry.slug);
        if (content) content.html = entry.html;
      }
      processed.clear();
    },
    assets: [createStyleAsset(RELATED_POSTS_PLUGIN_NAME)],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const relatedPostsPlugin = relatedPosts;

function validateRelatedPostsOptions(
  options: RelatedPostsOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.limit !== undefined &&
    (!Number.isInteger(options.limit) || options.limit < 0)
  ) {
    issues.push({ path: "limit", message: "Expected a non-negative integer." });
  }
  if (
    options.minScore !== undefined &&
    (!Number.isFinite(options.minScore) || options.minScore < 0)
  ) {
    issues.push({
      path: "minScore",
      message: "Expected a non-negative finite number.",
    });
  }
  if (options.heading !== undefined && typeof options.heading !== "boolean") {
    issues.push({ path: "heading", message: "Expected a boolean." });
  }
  if (
    options.headingText !== undefined &&
    (typeof options.headingText !== "string" ||
      options.headingText.trim() === "")
  ) {
    issues.push({
      path: "headingText",
      message: "Expected a non-empty string.",
    });
  }
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }
  if (options.useTags !== undefined && typeof options.useTags !== "boolean") {
    issues.push({ path: "useTags", message: "Expected a boolean." });
  }
  if (
    options.useBacklinks !== undefined &&
    typeof options.useBacklinks !== "boolean"
  ) {
    issues.push({ path: "useBacklinks", message: "Expected a boolean." });
  }
  return issues;
}
