import type { Content, Parent, Root, Text } from "mdast";

const MARKER = "%%";

/**
 * Removes Obsidian `%%comment%%` content before any other transform runs.
 *
 * A comment can span several inline nodes and paragraphs, so the state is
 * carried through the whole tree. Markers inside code fences are untouched
 * because code nodes hold their source as a value, not as child text nodes.
 */
export function remarkObsidianComment() {
  return (tree: Root) => {
    const state = { open: false };
    prune(tree, state);
  };
}

function prune(parent: Parent, state: { open: boolean }): void {
  const children: Content[] = [];

  for (const child of parent.children) {
    if (child.type === "text") {
      const value = strip(child, state);
      if (!value) continue;
      children.push({ ...child, value });
      continue;
    }

    if (state.open) continue;

    if ("children" in child) {
      prune(child as Parent, state);
      if (isBlankBlock(child)) continue;
    }
    children.push(child);
  }

  parent.children = children;
}

const CONTAINER_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "list",
  "listItem",
  "table",
]);

function isBlankBlock(node: Content): boolean {
  return (
    CONTAINER_TYPES.has(node.type) &&
    "children" in node &&
    node.children.length === 0
  );
}

function strip(node: Text, state: { open: boolean }): string {
  let value = "";
  let cursor = 0;

  while (cursor < node.value.length) {
    if (state.open) {
      const close = node.value.indexOf(MARKER, cursor);
      if (close < 0) return value;
      state.open = false;
      cursor = close + MARKER.length;
      continue;
    }

    const open = node.value.indexOf(MARKER, cursor);
    if (open < 0) {
      value += node.value.slice(cursor);
      return value;
    }
    value += node.value.slice(cursor, open);
    state.open = true;
    cursor = open + MARKER.length;
  }

  return value;
}
