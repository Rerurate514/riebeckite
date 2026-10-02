import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { rehypeLightbox } from "./src/rehype.js";
import type { LightboxOptions } from "./src/types.js";

export { initLightbox } from "./src/init.js";
export { rehypeLightbox } from "./src/rehype.js";
export type { LightboxInitOptions, LightboxOptions } from "./src/types.js";

export function lightboxPlugin(options: LightboxOptions = {}) {
  return definePlugin({
    name: "lightbox",
    processedContentCache: {
      version: "lightbox-v1",
      dependencyMode: "none",
    },
    options,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeLightbox, options);
    },
    assets: [createStyleAsset("lightbox")],
    clientEntries: [createClientEntry("lightbox", "initLightbox")],
  });
}
