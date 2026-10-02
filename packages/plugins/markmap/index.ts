import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { rehypeMarkmap } from "./src/rehype.js";
import type { MarkmapOptions } from "./src/types.js";

export { resolveMarkmapOptions } from "./src/options.js";
export { describeMarkmapTree, parseMarkmapSource } from "./src/parse.js";
export type {
  MarkmapClientOptions,
  MarkmapNode,
  MarkmapOptions,
  MarkmapResolvedOptions,
} from "./src/types.js";

/**
 * Renders fenced `markmap` code blocks as Markdown-heading mindmaps. The mindmap
 * is drawn in the browser by `initMarkmap`, which imports `markmap-lib` and
 * `markmap-view` from the CDN only when a figure is present.
 */
export function markmap(options: MarkmapOptions = {}) {
  return definePlugin({
    name: "markmap",
    order: -10,
    processedContentCache: {
      version: "markmap-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateMarkmapOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeMarkmap, options);
    },
    assets: [createStyleAsset("markmap")],
    clientEntries: [createClientEntry("markmap", "initMarkmap")],
  });
}

/** Alias kept for symmetry with the other plugin factories. */
export const markmapPlugin = markmap;

function validateMarkmapOptions(
  options: MarkmapOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  for (const key of ["caption", "fallback"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }

  for (const key of ["className", "language"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  if (
    options.height !== undefined &&
    (typeof options.height !== "number" ||
      !Number.isFinite(options.height) ||
      options.height <= 0)
  ) {
    issues.push({ path: "height", message: "Expected a positive number." });
  }

  if (
    options.colorFreezeLevel !== undefined &&
    (!Number.isInteger(options.colorFreezeLevel) ||
      options.colorFreezeLevel < 0)
  ) {
    issues.push({
      path: "colorFreezeLevel",
      message: "Expected a non-negative integer.",
    });
  }

  return issues;
}
