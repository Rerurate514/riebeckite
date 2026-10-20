import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import type { MermaidPeleOptions } from "./src/types.js";

export type { MermaidPeleOptions } from "./src/types.js";

export function mermaidPele(options: MermaidPeleOptions = {}) {
  return definePlugin({
    name: "mermaid-pele",
    order: -10,
    processedContentCache: {
      version: "mermaid-pele-v1",
      dependencyMode: "none",
    },
    options,
    validateOptions: validateMermaidPeleOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeMermaidPeleLazy, options);
    },
    assets: [
      createStyleAsset(
        "mermaid-pele",
        "@riebeckite/plugin-mermaid-pele/style.css",
      ),
    ],
  });
}

function validateMermaidPeleOptions(
  options: MermaidPeleOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options || options.theme === undefined || options.theme === "auto") {
    return [];
  }
  return [{ path: "theme", message: 'Expected "auto".' }];
}

function rehypeMermaidPeleLazy(options: MermaidPeleOptions = {}) {
  return async (tree: unknown, file: unknown) => {
    const { rehypeMermaidPele } = await import("./src/transformer.js");
    rehypeMermaidPele(options)(tree, file);
  };
}
