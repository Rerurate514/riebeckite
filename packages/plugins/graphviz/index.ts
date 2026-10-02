import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import type { GraphvizOptions } from "./src/types.js";

export type {
  GraphvizClientOptions,
  GraphvizEngine,
  GraphvizOptions,
  GraphvizRenderMode,
} from "./src/types.js";
export { GRAPHVIZ_ENGINES } from "./src/types.js";

export function graphviz(options: GraphvizOptions = {}) {
  return definePlugin({
    name: "graphviz",
    order: -10,
    processedContentCache: {
      version: "graphviz-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateGraphvizOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeGraphvizLazy, options);
    },
    assets: [createStyleAsset("graphviz")],
    clientEntries: [createClientEntry("graphviz", "initGraphvizDiagrams")],
  });
}

export const graphvizPlugin = graphviz;

function validateGraphvizOptions(
  options: GraphvizOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.render !== undefined &&
    options.render !== "build" &&
    options.render !== "client" &&
    options.render !== "both"
  ) {
    issues.push({
      path: "render",
      message: 'Expected "build", "client", or "both".',
    });
  }
  if (
    options.engine !== undefined &&
    !["dot", "neato", "fdp", "sfdp", "circo", "twopi"].includes(options.engine)
  ) {
    issues.push({
      path: "engine",
      message: 'Expected "dot", "neato", "fdp", "sfdp", "circo", or "twopi".',
    });
  }
  for (const key of ["caption", "fallback"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  if (
    options.className !== undefined &&
    typeof options.className !== "string"
  ) {
    issues.push({ path: "className", message: "Expected a string." });
  }
  return issues;
}

function rehypeGraphvizLazy(options: GraphvizOptions = {}) {
  return async (tree: unknown, file: unknown) => {
    const { rehypeGraphviz } = await import("./src/rehype.js");
    const transformer = rehypeGraphviz(options) as (
      tree: unknown,
      file: unknown,
    ) => Promise<void> | void;
    await transformer(tree, file);
  };
}
