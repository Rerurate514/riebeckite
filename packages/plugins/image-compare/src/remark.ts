import type { Root } from "mdast";
import { visit } from "unist-util-visit";

type RemarkImageCompareOptions = {
  language?: string;
};

export const IMAGE_COMPARE_COMPONENT_NAME = "ImageCompare";

export function remarkImageCompare(options: RemarkImageCompareOptions = {}) {
  const language = options.language ?? "image-compare";

  return (tree: Root) => {
    visit(tree, "code", (node) => {
      if (node.lang !== language) return;
      node.lang = "riebeckite-component";
      node.meta = IMAGE_COMPARE_COMPONENT_NAME;
      node.value = stripFrontmatterDelimiters(node.value);
    });
  };
}

function stripFrontmatterDelimiters(source: string): string {
  const lines = source.split("\n");
  const first = lines.findIndex((line) => line.trim().length > 0);
  if (first === -1 || lines[first]?.trim() !== "---") return source;
  const last = lines.findLastIndex((line) => line.trim().length > 0);
  if (last !== first && lines[last]?.trim() === "---") {
    lines.splice(last, 1);
  }
  lines.splice(first, 1);
  return lines.join("\n");
}
