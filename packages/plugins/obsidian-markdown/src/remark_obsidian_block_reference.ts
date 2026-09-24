import type { Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

const BLOCK_ID_RE = /(?:^|\s)\^([A-Za-z0-9_-]+)\s*$/;

export function remarkObsidianBlockReference() {
  return (tree: Root) => {
    visit(tree, (node, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (!isParentWithData(node) || node.type === "root") return;

      const textNode = findLastTextNode(node);
      if (!textNode) return;

      const match = textNode.value.match(BLOCK_ID_RE);
      const blockId = match?.[1];
      if (!blockId) return;

      textNode.value = textNode.value.slice(0, match.index).trimEnd();
      if (textNode.value === "") removeEmptyTextNode(node, textNode);
      node.data = {
        ...node.data,
        hProperties: {
          ...node.data?.hProperties,
          id: blockId,
          "data-block-id": blockId,
        },
      };
    });
  };
}

type ParentWithData = Parent & {
  type: string;
  data?: {
    hProperties?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

function isParentWithData(node: unknown): node is ParentWithData {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    "children" in node &&
    typeof (node as { type: unknown }).type === "string"
  );
}

function findLastTextNode(node: Parent): Text | null {
  const children = node.children;
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (!child) continue;
    if (child.type === "text") return child;
    if ("children" in child) {
      const textNode = findLastTextNode(child as Parent);
      if (textNode) return textNode;
    }
  }
  return null;
}

function removeEmptyTextNode(node: Parent, textNode: Text) {
  const children = node.children;
  const index = children.indexOf(textNode);
  if (index >= 0) {
    children.splice(index, 1);
    return;
  }

  for (const child of children) {
    if ("children" in child) {
      removeEmptyTextNode(child as Parent, textNode);
    }
  }
}
