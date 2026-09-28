import type { ElementNode, HastNode } from "./types.js";

export function visitElements(
  node: HastNode,
  visitor: (node: ElementNode, parent?: ElementNode, index?: number) => void,
  parent?: ElementNode,
  index?: number,
): void {
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

export function hasProperty(node: ElementNode, key: string): boolean {
  return node.properties?.[key] !== undefined;
}

export function ensureProperty(
  node: ElementNode,
  key: string,
  value: string,
): void {
  if (!node.properties) node.properties = {};
  if (key in node.properties) return;
  node.properties[key] = value;
}

function getChildren(node: HastNode): HastNode[] {
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? (children as HastNode[]) : [];
}
