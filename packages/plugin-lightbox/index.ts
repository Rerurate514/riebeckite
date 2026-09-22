import { definePlugin } from "@riebeckite/core";
import { rehypeLightbox } from "./src/rehype.js";
import type { LightboxOptions } from "./src/types.js";

export { initLightbox } from "./src/init.js";
export { rehypeLightbox } from "./src/rehype.js";
export type { LightboxInitOptions, LightboxOptions } from "./src/types.js";

export function lightboxPlugin(options: LightboxOptions = {}) {
  return definePlugin({
    name: "lightbox",
    options,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeLightbox, options);
    },
    injectAssets: () => [
      {
        pluginName: "lightbox",
        kind: "style",
        path: "@riebeckite/plugin-lightbox/style.css",
      },
    ],
  });
}
