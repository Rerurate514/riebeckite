import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";

type RemarkImageCompareOptions = {
  language?: string;
};

export const IMAGE_COMPARE_COMPONENT_ATTRIBUTE =
  'data-riebeckite-component="ImageCompare"';

export function remarkImageCompare(options: RemarkImageCompareOptions = {}) {
  const language = options.language ?? "image-compare";

  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const props = Buffer.from(
        JSON.stringify({ source: node.value }),
        "utf8",
      ).toString("base64");
      const html: Html = {
        type: "html",
        value: `<div data-riebeckite-component="ImageCompare" data-riebeckite-component-props="${props}" data-riebeckite-component-deferred="true"></div>`,
      };
      parent.children.splice(index, 1, html);
    });
  };
}
