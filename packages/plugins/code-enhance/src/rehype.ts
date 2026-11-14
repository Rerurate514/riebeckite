import rehypePrettyCode from "rehype-pretty-code";
import {
  DEFAULT_THEME,
  getDeterministicHighlighter,
} from "./code_enhance_highlight.js";
import {
  normalizeCodeLanguages,
  restoreCodeMeta,
} from "./code_enhance_meta.js";
import { enhancePrettyCodeFigures } from "./code_enhance_pretty.js";
import { mergeClassName } from "./hast.js";
import type { CodeEnhanceOptions, ElementNode, HastNode } from "./types.js";

export function rehypeCodeEnhance(options: CodeEnhanceOptions = {}) {
  const prettyCode = rehypePrettyCode({
    getHighlighter: getDeterministicHighlighter,
    theme: (options.theme ?? DEFAULT_THEME) as never,
    keepBackground: false,
    defaultLang: { block: "text", inline: "text" },
    onVisitLine(node: ElementNode) {
      node.properties = {
        ...node.properties,
        className: mergeClassName(node.properties?.className, "rr-code__line"),
      };
    },
    onVisitHighlightedLine(node: ElementNode) {
      if (options.lineHighlight === false) return;
      node.properties = {
        ...node.properties,
        className: mergeClassName(
          node.properties?.className,
          "rr-code__line--highlighted",
        ),
      };
    },
    onVisitHighlightedChars(node: ElementNode) {
      if (options.lineHighlight === false) return;
      node.properties = {
        ...node.properties,
        className: mergeClassName(
          node.properties?.className,
          "rr-code__chars--highlighted",
        ),
      };
    },
  });

  return async (tree: HastNode, file: unknown) => {
    restoreCodeMeta(tree);
    normalizeCodeLanguages(tree);
    if (typeof prettyCode === "function") {
      await (
        prettyCode as (tree: HastNode, file: unknown) => Promise<void> | void
      )(tree, file);
    }
    enhancePrettyCodeFigures(tree, options);
  };
}
