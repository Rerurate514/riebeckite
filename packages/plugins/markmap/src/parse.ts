import type { MarkmapNode } from "./types.js";

/** Matches an ATX Markdown heading (`#` through `######`). */
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*#*[ \t]*$/;

/** Matches the opening/closing fence of a fenced code block. */
const CODE_FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Parses a fenced code block body written in the standard Markmap
 * Markdown-heading notation into a mindmap tree.
 *
 * This is the **input-notation seam** of the plugin: every supported notation
 * produces the same `MarkmapNode` shape, so a future alternative notation (for
 * example an "ExcaliMindMap"-style outline) only has to add another parser
 * here instead of touching the figure/render path. See the READMEs for the
 * documented contract.
 *
 * Returns `null` when the source contains no heading at all, which the rehype
 * transformer reports as an invalid block. Content inside fenced code blocks is
 * ignored, mirroring Markdown parsing.
 */
export function parseMarkmapSource(source: string): MarkmapNode | null {
  const roots: MarkmapNode[] = [];
  const stack: Array<{ level: number; node: MarkmapNode }> = [];
  let fence: string | null = null;

  for (const line of source.split(/\r?\n/)) {
    const fenceMatch = CODE_FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const heading = ATX_HEADING.exec(line);
    if (!heading) continue;

    const level = heading[1].length;
    const node: MarkmapNode = {
      content: (heading[2] ?? "").trim(),
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) parent.node.children.push(node);
    else roots.push(node);
    stack.push({ level, node });
  }

  if (roots.length === 0) return null;
  if (roots.length === 1) return roots[0];
  return { content: "", children: roots };
}

/**
 * Returns a human-readable label for a parsed tree, used as a fallback
 * accessible name for the rendered canvas.
 */
export function describeMarkmapTree(tree: MarkmapNode | null): string {
  if (!tree) return "";
  if (tree.content.trim() !== "") return tree.content.trim();
  for (const child of tree.children) {
    const label = describeMarkmapTree(child);
    if (label !== "") return label;
  }
  return "";
}
