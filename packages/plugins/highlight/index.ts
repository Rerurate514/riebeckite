import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkHighlight } from "./src/remark.js";
import type { HighlightOptions } from "./src/types.js";

export { remarkHighlight } from "./src/remark.js";
export type { HighlightOptions } from "./src/types.js";

const TAG_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9-]*$/;

export function highlight(options: HighlightOptions = {}) {
  return definePlugin({
    name: "highlight",
    options,
    validateOptions: validateHighlightOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkHighlight, options);
    },
    assets: [createStyleAsset("highlight")],
  });
}

/** Alias kept for parity with plugins that export a `…Plugin` factory. */
export const highlightPlugin = highlight;

function validateHighlightOptions(
  options: HighlightOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.className !== undefined &&
    typeof options.className !== "string"
  ) {
    issues.push({ path: "className", message: "Expected a string." });
  }
  if (
    options.tag !== undefined &&
    (typeof options.tag !== "string" || !TAG_NAME_PATTERN.test(options.tag))
  ) {
    issues.push({
      path: "tag",
      message: 'Expected an HTML tag name such as "mark".',
    });
  }
  return issues;
}
