import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
  type ConfigValidationIssue,
} from "@riebeckite/core";
import type { HastNode, MermaidOptions } from "./src/types.js";

export type {
  MermaidClientOptions,
  MermaidOptions,
  MermaidRenderMode,
  MermaidTheme,
} from "./src/types.js";

export function mermaid(options: MermaidOptions = {}) {
  return definePlugin({
    name: "mermaid",
    order: -10,
    options,
    validateOptions: validateMermaidOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeMermaidLazy, options);
    },
    assets: [createStyleAsset("mermaid")],
    clientEntries: [createClientEntry("mermaid", "initMermaidDiagrams")],
  });
}

function validateMermaidOptions(
  options: MermaidOptions | undefined,
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
  if (!isMermaidTheme(options.theme)) {
    issues.push({
      path: "theme",
      message:
        "Expected a theme string or an object with light and dark strings.",
    });
  }
  for (const key of ["caption", "fallback"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }
  return issues;
}

function isMermaidTheme(value: unknown): boolean {
  return (
    value === undefined ||
    typeof value === "string" ||
    (typeof value === "object" &&
      value !== null &&
      "light" in value &&
      "dark" in value &&
      typeof value.light === "string" &&
      typeof value.dark === "string")
  );
}

function rehypeMermaidLazy(options: MermaidOptions = {}) {
  return async (tree: HastNode, file: unknown) => {
    const { rehypeMermaid } = await import("./src/rehype.js");
    const transformer = rehypeMermaid(options) as (
      tree: HastNode,
      file: unknown,
    ) => Promise<void> | void;
    await transformer(tree, file);
  };
}
