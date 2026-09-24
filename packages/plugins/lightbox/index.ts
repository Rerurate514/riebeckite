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
    assets: [
      {
        pluginName: "lightbox",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-lightbox/style.css",
      },
    ],
    clientEntries: [
      {
        pluginName: "lightbox",
        moduleSpecifier: "@riebeckite/plugin-lightbox/client",
        exportName: "initLightbox",
      },
    ],
  });
}
