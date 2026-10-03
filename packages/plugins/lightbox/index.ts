import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { rehypeLightbox } from "./src/rehype.js";
import {
  DEFAULT_CLOSE_LABEL,
  DEFAULT_EXPAND_LABEL,
  type LightboxOptions,
} from "./src/types.js";

export { initLightboxFromOptions } from "./client.js";
export { initLightbox } from "./src/init.js";
export { rehypeLightbox } from "./src/rehype.js";
export type { LightboxInitOptions, LightboxOptions } from "./src/types.js";

export function lightboxPlugin(options: LightboxOptions = {}) {
  return definePlugin({
    name: "lightbox",
    processedContentCache: {
      version: "lightbox-v2",
      dependencyMode: "none",
    },
    options,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeLightbox, options);
    },
    assets: [createStyleAsset("lightbox")],
    clientEntries: [
      createClientEntry("lightbox", "initLightboxFromOptions", {
        expandLabel: options.expandLabel ?? DEFAULT_EXPAND_LABEL,
        closeLabel: options.closeLabel ?? DEFAULT_CLOSE_LABEL,
      }),
    ],
  });
}
