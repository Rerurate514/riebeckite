import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkAutoCardLink } from "./src/remark.js";
import type { AutoCardLinkOptions } from "./src/types.js";

export type { AutoCardLinkLayoutOptions } from "./src/init.js";
export { initAutoCardLink } from "./src/init.js";
export { remarkAutoCardLink } from "./src/remark.js";
export type { AutoCardLink, AutoCardLinkOptions } from "./src/types.js";

export function autoCardLinkPlugin(options: AutoCardLinkOptions = {}) {
  return definePlugin({
    name: "autocardlink",
    processedContentCache: {
      version: "autocardlink-v1",
      dependencyMode: "none",
    },
    options,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkAutoCardLink, options);
    },
    assets: [createStyleAsset("autocardlink")],
    clientEntries: [createClientEntry("autocardlink", "initAutoCardLink")],
  });
}
