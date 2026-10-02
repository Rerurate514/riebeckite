import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { remarkBases } from "./src/remark.js";
import { createBasesRuntime } from "./src/runtime.js";
import type { BasesOptions } from "./src/types.js";

export { matchesCondition, resolveValueRef } from "./src/evaluate.js";
export { parseBases } from "./src/parse.js";
export { remarkBases } from "./src/remark.js";
export type {
  BasesBuiltinValue,
  BasesCondition,
  BasesLiteral,
  BasesOperator,
  BasesOptions,
  BasesSpec,
  BasesValueRef,
  BasesView,
  BasesViewType,
} from "./src/types.js";

/**
 * Renders Obsidian Bases definitions from fenced `base` code blocks.
 *
 * A block body is an Obsidian Base YAML document. It is compiled to a filter /
 * sort / view spec at parse time and rendered against the content manifest at
 * build time, so no client-side JavaScript is required.
 */
export function bases(options: BasesOptions = {}) {
  const language = options.language ?? "base";
  const runtime = createBasesRuntime(options);

  return definePlugin({
    name: "bases",
    processedContentCache: {
      version: "bases-v1",
      dependencyMode: "none",
    },
    options,
    provides: ["content.bases"],
    validateOptions: validateBasesOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkBases, { language });
    },
    onPostProcessed: (context) => {
      runtime.track(context.slug, context.content);
    },
    onManifestCreated: (context) => {
      runtime.resolve(context.manifest, context.diagnostics, context.config);
    },
    assets: [createStyleAsset("bases")],
  });
}

/** Alias kept for symmetry with other plugin factories. */
export const basesPlugin = bases;

function validateBasesOptions(
  options: BasesOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }
  if (
    options.language !== undefined &&
    (typeof options.language !== "string" || options.language.trim() === "")
  ) {
    issues.push({ path: "language", message: "Expected a non-empty string." });
  }
  if (
    options.limit !== undefined &&
    (!Number.isFinite(options.limit) || options.limit < 0)
  ) {
    issues.push({
      path: "limit",
      message: "Expected a non-negative finite number.",
    });
  }
  if (
    options.showFallback !== undefined &&
    typeof options.showFallback !== "boolean"
  ) {
    issues.push({ path: "showFallback", message: "Expected a boolean." });
  }
  if (
    options.view !== undefined &&
    (typeof options.view !== "string" || options.view.trim() === "")
  ) {
    issues.push({ path: "view", message: "Expected a non-empty string." });
  }
  return issues;
}
