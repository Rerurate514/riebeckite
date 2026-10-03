import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { rehypeCodeEnhance } from "./src/rehype.js";
import { remarkCodeMeta } from "./src/remark.js";
import type { CodeEnhanceOptions } from "./src/types.js";

export { initCodeEnhance } from "./src/init.js";
export { rehypeCodeEnhance } from "./src/rehype.js";
export { remarkCodeMeta } from "./src/remark.js";
export type {
  CodeEnhanceClientOptions,
  CodeEnhanceOptions,
  CodeEnhanceTheme,
} from "./src/types.js";

export function codeEnhance(options: CodeEnhanceOptions = {}) {
  return definePlugin({
    name: "code-enhance",
    processedContentCache: {
      version: "code-enhance-v2",
      dependencyMode: "none",
    },
    options,
    remarkPlugins: [remarkCodeMeta],
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeCodeEnhance, options);
    },
    assets: [createStyleAsset("code-enhance")],
    clientEntries: [createClientEntry("code-enhance", "initCodeEnhance")],
  });
}
