import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { createVaultHeatmapPlaceholder } from "./placeholder.js";

type RemarkVaultHeatmapOptions = {
  language?: string;
};

export function remarkVaultHeatmap(options: RemarkVaultHeatmapOptions = {}) {
  const language = options.language ?? "vault-heatmap";

  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const html: Html = {
        type: "html",
        value: createVaultHeatmapPlaceholder(node.value),
      };
      parent.children.splice(index, 1, html);
    });
  };
}
