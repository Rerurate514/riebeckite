import {
  createStyleAsset,
  definePlugin,
  type ConfigValidationIssue,
} from "@riebeckite/core";
import type { HastNode, MarpOptions } from "./src/types.js";

export type {
  MarpBuildRenderResult,
  MarpDeck,
  MarpOptions,
} from "./src/types.js";

const CLASS_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * Renders ` ```marp ` code blocks as static Marp slide decks at build time.
 *
 * Marp Core is loaded through a dynamic import inside the HTML pipeline, so it
 * never becomes part of the client bundle.
 */
export function marp(options: MarpOptions = {}) {
  return definePlugin({
    name: "marp",
    order: -10,
    options,
    validateOptions: validateMarpOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeMarpLazy, options);
    },
    assets: [createStyleAsset("marp")],
  });
}

/** Alias matching the `*Plugin` naming used by other Riebeckite plugins. */
export const marpPlugin = marp;

function validateMarpOptions(
  options: MarpOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  if (options.theme !== undefined) {
    if (typeof options.theme !== "string" || options.theme.trim() === "") {
      issues.push({
        path: "theme",
        message: 'Expected a non-empty theme name such as "default".',
      });
    }
  }

  for (const key of ["allowHtml", "math", "inlineSVG", "caption"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }

  if (options.className !== undefined) {
    if (
      typeof options.className !== "string" ||
      !CLASS_NAME_PATTERN.test(options.className.trim())
    ) {
      issues.push({
        path: "className",
        message:
          "Expected a CSS class name beginning with a letter (letters, digits, `_`, `-`).",
      });
    }
  }

  return issues;
}

function rehypeMarpLazy(options: MarpOptions = {}) {
  return async (tree: HastNode, file: unknown) => {
    const { rehypeMarp } = await import("./src/rehype.js");
    const transformer = rehypeMarp(options) as (
      tree: HastNode,
      file: unknown,
    ) => Promise<void> | void;
    await transformer(tree, file);
  };
}
