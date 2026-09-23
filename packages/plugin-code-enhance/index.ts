import { definePlugin } from "@riebeckite/core";
import { rehypeCodeEnhance } from "./src/rehype.js";
import type { CodeEnhanceOptions } from "./src/types.js";

export { initCodeEnhance } from "./src/init.js";
export { rehypeCodeEnhance } from "./src/rehype.js";
export type {
  CodeEnhanceClientOptions,
  CodeEnhanceOptions,
  CodeEnhanceTheme,
} from "./src/types.js";

export function codeEnhance(options: CodeEnhanceOptions = {}) {
  return definePlugin({
    name: "code-enhance",
    options,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeCodeEnhance, options);
    },
    assets: [
      {
        pluginName: "code-enhance",
        kind: "style",
        path: "@riebeckite/plugin-code-enhance/style.css",
        moduleSpecifier: "@riebeckite/plugin-code-enhance/style.css",
      },
    ],
    clientEntries: [
      {
        pluginName: "code-enhance",
        moduleSpecifier: "@riebeckite/plugin-code-enhance/client",
        exportName: "initCodeEnhance",
      },
    ],
  });
}
