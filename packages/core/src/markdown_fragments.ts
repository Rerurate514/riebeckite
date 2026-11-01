import remarkParse from "remark-parse";
import { unified } from "unified";
import type { MarkdownEmbedFragment } from "./types/plugin_pipeline.js";

type Position = {
  readonly start?: { readonly offset?: number };
  readonly end?: { readonly offset?: number };
};

type MarkdownNode = {
  readonly type?: string;
  readonly value?: string;
  readonly depth?: number;
  readonly children?: readonly MarkdownNode[];
  readonly position?: Position;
};

type SourceRange = { readonly start: number; readonly end: number };

const CONTAINER_BLOCKS = new Set(["blockquote", "listItem"]);

export function selectEmbedMarkdownFragment(
  markdown: string,
  fragment: MarkdownEmbedFragment | null,
): string | null {
  if (!fragment) return markdown;

  const tree = unified().use(remarkParse).parse(markdown) as MarkdownNode;
  const range =
    fragment.kind === "block"
      ? findBlockFragment(tree, fragment.value)
      : findHeadingFragment(tree, fragment.value);
  if (!range) return null;

  return markdown.slice(range.start, range.end).trim() || null;
}

/**
 * Locates the block a `^block-id` marker is attached to.
 *
 * Obsidian attaches the marker to the block that ends with it, or to the block
 * before a marker written on its own line. Composite blocks (list items and
 * block quotes) keep their nested children, so embedding reproduces the whole
 * block instead of just the line the marker sits on.
 */
function findBlockFragment(
  tree: MarkdownNode,
  blockId: string,
): SourceRange | null {
  const marker = `^${blockId}`;
  let target: MarkdownNode | null = null;

  walkNodes(tree, (node, parent) => {
    if (target || !isBlockNode(node)) return;
    const kind = markerKind(node, marker);
    if (!kind) return;

    if (kind === "standalone") {
      const index = parent?.children?.indexOf(node) ?? -1;
      target =
        parent?.type === "listItem"
          ? parent
          : (parent?.children?.[index - 1] ?? null);
      return;
    }

    let current = node;
    let owner = parent;
    while (
      owner &&
      CONTAINER_BLOCKS.has(owner.type ?? "") &&
      owner.children?.at(-1) === current
    ) {
      current = owner;
      owner = parentOf(tree, owner);
    }
    target = current;
  });

  return target ? rangeOf(target) : null;
}

function findHeadingFragment(
  tree: MarkdownNode,
  heading: string,
): SourceRange | null {
  const wanted = normalizeHeading(heading);
  let start: MarkdownNode | undefined;
  let owner: MarkdownNode | undefined;

  walkNodes(tree, (node, parent) => {
    if (start || node.type !== "heading") return;
    if (normalizeHeading(textOf(node)) !== wanted) return;
    start = node;
    owner = parent;
  });

  if (!start) return null;
  const startRange = rangeOf(start);
  if (!startRange) return null;

  const level = start.depth ?? 6;
  const children = owner?.children ?? [];
  let endOffset = startRange.end;
  for (
    let index = (children.indexOf(start) ?? -1) + 1;
    index > 0 && index < children.length;
    index += 1
  ) {
    const sibling = children[index];
    if (!sibling) continue;
    if (sibling.type === "heading" && (sibling.depth ?? 6) <= level) break;
    endOffset = rangeOf(sibling)?.end ?? endOffset;
  }

  return { start: startRange.start, end: endOffset };
}

type MarkerKind = "standalone" | "trailing";

function markerKind(node: MarkdownNode, marker: string): MarkerKind | null {
  if (!hasTrailingMarker(node, marker)) return null;
  return textOf(node).trim() === marker ? "standalone" : "trailing";
}

function hasTrailingMarker(node: MarkdownNode, marker: string): boolean {
  if (node.type === "code") {
    const code = node.value ?? "";
    if (!code.trimEnd().endsWith(marker)) return false;
    const before = code.trimEnd().slice(0, -marker.length);
    return before.length === 0 || /\s$/.test(before);
  }
  if (!node.children || node.children.length === 0) return false;
  const text = textOf(node).trimEnd();
  if (!text.endsWith(marker)) return false;
  const before = text.slice(0, -marker.length);
  return before.length === 0 || /\s$/.test(before);
}

function textOf(node: MarkdownNode): string {
  if (node.type === "text" || node.type === "code" || node.type === "html") {
    return node.value ?? "";
  }
  return (node.children ?? []).map(textOf).join("");
}

function normalizeHeading(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function rangeOf(node: MarkdownNode): SourceRange | null {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  return typeof start === "number" && typeof end === "number" && end > start
    ? { start, end }
    : null;
}

function isBlockNode(node: MarkdownNode): boolean {
  switch (node.type) {
    case "paragraph":
    case "heading":
    case "code":
    case "table":
    case "html":
    case "listItem":
    case "blockquote":
      return true;
    default:
      return false;
  }
}

function walkNodes(
  root: MarkdownNode,
  visit: (node: MarkdownNode, parent: MarkdownNode | undefined) => void,
  parent?: MarkdownNode,
): void {
  visit(root, parent);
  for (const child of root.children ?? []) walkNodes(child, visit, root);
}

function parentOf(
  root: MarkdownNode,
  sought: MarkdownNode,
): MarkdownNode | undefined {
  let found: MarkdownNode | undefined;
  const search = (node: MarkdownNode) => {
    if (found) return;
    for (const child of node.children ?? []) {
      if (child === sought) {
        found = node;
        return;
      }
      search(child);
    }
  };
  search(root);
  return found;
}
