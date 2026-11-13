import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { imageCompareComponent } from "./src/component.js";
import { remarkImageCompare } from "./src/remark.js";
import type { ImageCompareOptions } from "./src/types.js";

export { initImageCompare } from "./src/init.js";
export { parseImageCompare } from "./src/parse.js";
export {
  createImageComparePlaceholder,
  createImageComparePlaceholderPattern,
  decodeImageCompareSource,
  encodeImageCompareSource,
  IMAGE_COMPARE_ATTRIBUTE,
} from "./src/placeholder.js";
export { remarkImageCompare } from "./src/remark.js";
export {
  IMAGE_COMPARE_CLASS,
  renderImageCompare,
  renderImageCompareError,
} from "./src/render.js";
export type {
  ImageCompareOptions,
  ImageCompareOrientation,
  ImageCompareParseResult,
  ImageCompareSpec,
  ResolvedImageCompareSpec,
} from "./src/types.js";

export const IMAGE_COMPARE_PLUGIN_NAME = "image-compare";

export function imageCompare(options: ImageCompareOptions = {}) {
  const resolved = { language: options.language ?? "image-compare" };

  return definePlugin({
    name: IMAGE_COMPARE_PLUGIN_NAME,
    processedContentCache: {
      version: "image-compare-v3",
      dependencyMode: "none",
    },
    options,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkImageCompare, { language: resolved.language });
    },
    markdownComponents: [imageCompareComponent],
    assets: [
      createStyleAsset(
        IMAGE_COMPARE_PLUGIN_NAME,
        "@riebeckite/plugin-image-compare/style.css",
      ),
    ],
    clientEntries: [
      createClientEntry(
        IMAGE_COMPARE_PLUGIN_NAME,
        "@riebeckite/plugin-image-compare/client",
        "initImageCompare",
        undefined,
        "page",
        "context",
        "[data-rr-image-compare]",
      ),
    ],
  });
}
