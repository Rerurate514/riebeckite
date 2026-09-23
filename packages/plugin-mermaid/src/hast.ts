import type { ElementNode, HastNode, ParentNode, TextNode } from "./types.js";

export function visitElements(
  node: HastNode,
  visitor: (node: ElementNode, parent?: ParentNode, index?: number) => void,
  parent?: ParentNode,
  index?: number,
) {
  if (isElementNode(node)) visitor(node, parent, index);

  for (const [childIndex, child] of [...getChildren(node)].entries()) {
    visitElements(
      child,
      visitor,
      hasChildren(node) ? node : parent,
      childIndex,
    );
  }
}

export function element(
  tagName: string,
  properties: Record<string, unknown> = {},
  children: HastNode[] = [],
): ElementNode {
  return { type: "element", tagName, properties, children };
}

export function text(value: string): TextNode {
  return { type: "text", value };
}

export function getTextContent(node: HastNode): string {
  if (
    node.type === "text" &&
    "value" in node &&
    typeof node.value === "string"
  ) {
    return node.value;
  }
  return getChildren(node).map(getTextContent).join("");
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

export function hasClass(node: ElementNode, className: string): boolean {
  const value = node.properties?.className;
  const classes = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  return classes.includes(className);
}

export function mergeClassName(current: unknown, next: string): string {
  const currentClass = Array.isArray(current)
    ? current.join(" ")
    : typeof current === "string"
      ? current
      : "";
  return currentClass ? `${currentClass} ${next}` : next;
}

function isElementNode(node: HastNode): node is ElementNode {
  return node.type === "element";
}

function hasChildren(node: HastNode): node is ParentNode {
  return Array.isArray((node as { children?: unknown }).children);
}

function getChildren(node: HastNode): HastNode[] {
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? (children as HastNode[]) : [];
}
