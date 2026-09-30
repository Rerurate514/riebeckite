import { createStyleAsset, definePlugin } from "@riebeckite/core";
import { resolveCodeAnnotationsOptions } from "./src/options.js";
import { rehypeCodeAnnotations } from "./src/rehype.js";
import { remarkCodeAnnotations } from "./src/remark.js";
import type { CodeAnnotationsOptions } from "./src/types.js";

export type {
  CollectedCodeAnnotations,
  InlineCodeAnnotation,
} from "./src/annotations.js";
export {
  ANNOTATIONS_META_PREFIX,
  collectCodeAnnotations,
  createEmptyPlan,
  deserializeAnnotations,
  encodeAnnotationsMeta,
  extractAnnotationsMeta,
  hasAnnotations,
  parseCodeAnnotations,
  parseLineRanges,
  serializeAnnotations,
  stripInlineCodeAnnotation,
} from "./src/annotations.js";
export {
  DEFAULT_CODE_ANNOTATIONS_OPTIONS,
  resolveCodeAnnotationsOptions,
} from "./src/options.js";
export { rehypeCodeAnnotations } from "./src/rehype.js";
export { remarkCodeAnnotations } from "./src/remark.js";
export type {
  CodeAnnotationKind,
  CodeAnnotationPlan,
  CodeAnnotationsOptions,
  ResolvedCodeAnnotationsOptions,
} from "./src/types.js";

/**
 * VitePress/Docusaurus-style code block annotations: line highlighting from
 * fence meta and inline `[!code ...]` marker comments for focus, highlight,
 * and diff lines.
 *
 * Runs after `@riebeckite/plugin-code-enhance` (via `order`) so it can annotate
 * the line wrappers produced by `rehype-pretty-code` instead of re-wrapping
 * them. It never imports or depends on code-enhance.
 */
export function codeAnnotations(options: CodeAnnotationsOptions = {}) {
  const resolved = resolveCodeAnnotationsOptions(options);
  return definePlugin({
    name: "code-annotations",
    order: 10,
    options: resolved,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkCodeAnnotations, resolved);
    },
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeCodeAnnotations, resolved);
    },
    assets: [createStyleAsset("code-annotations")],
  });
}

export const codeAnnotationsPlugin = codeAnnotations;
