import { definePlugin } from "@riebeckite/core";
import { rehypeCodeAnnotations } from "./src/rehype.js";
import { remarkCodeAnnotations } from "./src/remark.js";

export type { CodeDiffPlan, DiffMarker } from "./src/annotations.js";
export {
  appendCodeDiffMeta,
  collectCodeDiff,
  deserializeCodeDiff,
  encodeCodeDiffMeta,
  extractCodeDiffMeta,
  removeCodeDiffMeta,
  serializeCodeDiff,
} from "./src/annotations.js";
export { rehypeCodeAnnotations } from "./src/rehype.js";
export { remarkCodeAnnotations } from "./src/remark.js";

export function codeAnnotations() {
  return definePlugin({
    name: "code-annotations",
    order: 10,
    processedContentCache: {
      version: "code-annotations-v2",
      dependencyMode: "none",
    },
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkCodeAnnotations);
    },
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeCodeAnnotations);
    },
  });
}

export const codeAnnotationsPlugin = codeAnnotations;
