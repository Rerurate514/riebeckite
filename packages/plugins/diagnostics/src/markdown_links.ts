import type { Root } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export type MarkdownReference = {
  kind: "link" | "image";
  url: string;
  line: number;
  column: number;
};

export function extractMarkdownReferences(
  markdown: string,
): MarkdownReference[] {
  const tree = unified().use(remarkParse).parse(markdown) as Root;
  const references: MarkdownReference[] = [];

  visit(tree, (node) => {
    if (node.type !== "link" && node.type !== "image") return;
    const url = (node as { url?: string }).url;
    if (!url) return;
    const start = node.position?.start;
    references.push({
      kind: node.type,
      url,
      line: start?.line ?? 0,
      column: start?.column ?? 0,
    });
  });

  return references;
}
