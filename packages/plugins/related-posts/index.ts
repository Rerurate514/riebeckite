import {
  appendContentBodySlot,
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { renderToString } from "hono/jsx/dom/server";
import RelatedPosts from "./components/related-posts.js";
import { resolveRelatedPostsOptions } from "./src/options.js";
import { buildRelatedPosts, isEligibleRelatedEntry } from "./src/related.js";
import type { RelatedPostsOptions } from "./src/types.js";

export { default as RelatedPosts } from "./components/related-posts.js";
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
export function relatedPosts(options: RelatedPostsOptions = {}) {
  const resolved = resolveRelatedPostsOptions(options);

  return definePlugin({
    name: RELATED_POSTS_PLUGIN_NAME,
    order: 100,
    processedContentCache: {
      version: "related-posts-v1",
      dependencyMode: "none",
    },
    outputDependencies: [{ type: "global" }],
    options,
    validateOptions: validateRelatedPostsOptions,
    onManifestCreated: (context) => {
      if (options.render === false) return;
      const { manifest } = context;
      for (const entry of manifest.discoverableEntries) {
        if (!isEligibleRelatedEntry(entry, manifest, context.config)) continue;

        const related = buildRelatedPosts({
          manifest,
          entry,
          options: resolved,
          config: context.config,
        });
        if (related.length === 0) continue;

        appendContentBodySlot(
          entry,
          "article.footer",
          renderToString(RelatedPosts({ entries: related, options: resolved })),
        );
      }
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
  if (options.render !== undefined && typeof options.render !== "boolean") {
    issues.push({ path: "render", message: "Expected a boolean." });
  }
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
