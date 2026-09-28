import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { createQueryPlaceholder } from "./placeholder.js";

export type RemarkQueryOptions = {
  language?: string;
};

export function remarkQuery(options: RemarkQueryOptions = {}) {
  const language = options.language ?? "query";

  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const html: Html = {
        type: "html",
        value: createQueryPlaceholder(node.value),
      };
      parent.children.splice(index, 1, html);
    });
  };
}
