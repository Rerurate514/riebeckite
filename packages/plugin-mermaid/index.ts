import { definePlugin } from "@riebeckite/core";
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
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeMermaidLazy, options);
    },
    injectAssets: () => [
      {
        pluginName: "mermaid",
        kind: "style",
        path: "@riebeckite/plugin-mermaid/style.css",
      },
    ],
  });
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
