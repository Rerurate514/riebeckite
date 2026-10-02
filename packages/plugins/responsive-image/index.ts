import {
  createStyleAsset,
  definePlugin,
  type PluginManifestContext,
  type PluginPostContext,
  type PostContent,
} from "@riebeckite/core";
import { applyResponsiveImages } from "./src/html.js";
import {
  type ResponsiveImageOptions,
  resolveResponsiveImageOptions,
  validateResponsiveImageOptions,
} from "./src/options.js";
import {
  RESPONSIVE_IMAGE_MARKER,
  rehypeResponsiveImage,
} from "./src/rehype.js";
import { collectKnownAssetPaths } from "./src/srcset.js";

const PLUGIN_NAME = "responsive-image";

export { applyResponsiveImages } from "./src/html.js";
export type {
  ResolvedResponsiveImageOptions,
  ResponsiveImageOptions,
} from "./src/options.js";
export {
  DEFAULT_RESPONSIVE_IMAGE_CLASS,
  DEFAULT_RESPONSIVE_IMAGE_FORMATS,
  DEFAULT_RESPONSIVE_IMAGE_SIZES,
  DEFAULT_RESPONSIVE_IMAGE_WIDTHS,
  resolveResponsiveImageOptions,
} from "./src/options.js";
export { rehypeResponsiveImage } from "./src/rehype.js";
export { buildResponsiveSrcset, collectKnownAssetPaths } from "./src/srcset.js";
export type {
  ResponsiveImagePlan,
  ResponsiveImageSource,
  ResponsiveImageVariant,
} from "./src/types.js";

/**
 * Build-time responsive image layer.
 *
 * The plugin normalises `loading`, `decoding` and `sizes` on `<img>` elements
 * during the HTML pipeline, then upgrades marked images into `<picture>` /
 * `srcset` markup only when matching sibling variants already exist in the
 * content manifest. It never fabricates URLs and never writes files.
 */
export function responsiveImage(options: ResponsiveImageOptions = {}) {
  const resolved = resolveResponsiveImageOptions(options);
  const tracked = new Map<string, PostContent>();

  return definePlugin({
    name: PLUGIN_NAME,
    order: 100,
    processedContentCache: {
      version: "responsive-image-v1",
      dependencyMode: "unsafe",
    },
    options,
    validateOptions: validateResponsiveImageOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeResponsiveImage, options);
    },
    onPostProcessed: (context: PluginPostContext) => {
      tracked.set(context.slug, context.content);
    },
    onManifestCreated: (context: PluginManifestContext) => {
      const knownPaths = collectKnownAssetPaths(context.manifest);

      for (const entry of context.manifest.entries) {
        if (!entry.html.includes(RESPONSIVE_IMAGE_MARKER)) continue;

        const html = applyResponsiveImages(entry.html, knownPaths, options);
        if (html === entry.html) continue;

        entry.html = html;
        const content = tracked.get(entry.slug);
        if (content) content.html = html;
      }

      if (resolved.generate) {
        context.logger.warn(
          "`generate` is reserved: image encoding is not implemented yet, so no images were generated.",
        );
      }
    },
    assets: [createStyleAsset(PLUGIN_NAME)],
  });
}

export const responsiveImagePlugin = responsiveImage;
