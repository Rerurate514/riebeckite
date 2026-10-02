import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { resolveGalleryOptions } from "./src/options.js";
import { remarkGallery } from "./src/remark.js";
import { createGalleryRuntime } from "./src/runtime.js";
import type { GalleryOptions } from "./src/types.js";

export type { ResolvedGalleryOptions } from "./src/options.js";
export {
  DEFAULT_GALLERY_ASPECT,
  DEFAULT_GALLERY_COLUMNS,
  resolveGalleryOptions,
} from "./src/options.js";
export { parseGallery } from "./src/parse.js";
export {
  createGalleryPlaceholder,
  createGalleryPlaceholderPattern,
  decodeGallerySource,
  encodeGallerySource,
  GALLERY_ATTRIBUTE,
} from "./src/placeholder.js";
export { remarkGallery } from "./src/remark.js";
export {
  GALLERY_CLASS,
  renderGallery,
  renderGalleryError,
} from "./src/render.js";
export type {
  GalleryItem,
  GalleryOptions,
  GalleryParseResult,
  GallerySpec,
  GalleryWarning,
} from "./src/types.js";

export const GALLERY_PLUGIN_NAME = "gallery";

/**
 * Renders fenced `gallery` code blocks as responsive card grids.
 *
 * The block body is a small YAML document with an `items` list and optional
 * `columns` / `aspect` overrides. Plain data only: no manifest query and no
 * client-side JavaScript.
 */
export function gallery(options: GalleryOptions = {}) {
  const resolved = resolveGalleryOptions(options);
  const runtime = createGalleryRuntime(resolved);

  return definePlugin({
    name: GALLERY_PLUGIN_NAME,
    processedContentCache: {
      version: "gallery-v1",
      dependencyMode: "unsafe",
    },
    options,
    validateOptions: validateGalleryOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkGallery, { language: resolved.language });
    },
    onPostProcessed: (context) => {
      runtime.track(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      runtime.resolve(context.manifest, context.diagnostics);
    },
    assets: [createStyleAsset(GALLERY_PLUGIN_NAME)],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const galleryPlugin = gallery;

function validateGalleryOptions(
  options: GalleryOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.language !== undefined &&
    (typeof options.language !== "string" || options.language.trim() === "")
  ) {
    issues.push({ path: "language", message: "Expected a non-empty string." });
  }
  if (
    options.columns !== undefined &&
    (!Number.isInteger(options.columns) || options.columns < 1)
  ) {
    issues.push({ path: "columns", message: "Expected a positive integer." });
  }
  if (
    options.aspect !== undefined &&
    (typeof options.aspect !== "string" || options.aspect.trim() === "")
  ) {
    issues.push({ path: "aspect", message: "Expected a non-empty string." });
  }
  return issues;
}
