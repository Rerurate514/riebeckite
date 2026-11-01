import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { createImageComparePlaceholder } from "./placeholder.js";

type RemarkImageCompareOptions = {
  language?: string;
};

export function remarkImageCompare(options: RemarkImageCompareOptions = {}) {
  const language = options.language ?? "image-compare";

  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const html: Html = {
        type: "html",
        value: createImageComparePlaceholder(node.value),
      };
      parent.children.splice(index, 1, html);
    });
  };
}
