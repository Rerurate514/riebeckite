import { definePlugin } from "@riebeckite/core";
import { remarkAutoCardLink } from "./src/remark.js";
import type { AutoCardLinkOptions } from "./src/types.js";

export { remarkAutoCardLink } from "./src/remark.js";
export type { AutoCardLink, AutoCardLinkOptions } from "./src/types.js";

export function autoCardLinkPlugin(options: AutoCardLinkOptions = {}) {
  return definePlugin({
    name: "autocardlink",
    options,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkAutoCardLink, options);
    },
    assets: [
      {
        pluginName: "autocardlink",
        kind: "style",
        path: "@riebeckite/plugin-autocardlink/style.css",
        moduleSpecifier: "@riebeckite/plugin-autocardlink/style.css",
      },
    ],
  });
}
