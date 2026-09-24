import type { ElementNode, HastNode } from "./types.js";

export function visitElements(
  node: HastNode,
  visitor: (node: ElementNode, parent?: ElementNode, index?: number) => void,
  parent?: ElementNode,
  index?: number,
) {
  if (isElementNode(node)) {
    visitor(node, parent, index);
  }

  for (const [childIndex, child] of [...getChildren(node)].entries()) {
    visitElements(
      child,
      visitor,
      isElementNode(node) ? node : parent,
      childIndex,
    );
  }
}

export function isElementNode(node: HastNode): node is ElementNode {
  return node.type === "element";
}

export function getStringProperty(
  node: ElementNode,
  key: string,
): string | null {
  const value = node.properties?.[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" ");
  return null;
}

export function mergeClassName(current: string | null, next: string): string {
  return current ? `${current} ${next}` : next;
}

function getChildren(node: HastNode): HastNode[] {
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? (children as HastNode[]) : [];
}
