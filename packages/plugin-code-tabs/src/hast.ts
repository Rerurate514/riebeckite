import type { ElementNode, HastNode, TextNode } from "./types.js";

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

export function getBooleanProperty(node: ElementNode, key: string): boolean {
  const value = node.properties?.[key];
  return value === true || value === "true";
}

export function mergeClassName(current: unknown, next: string): string {
  const currentClass = Array.isArray(current)
    ? current.join(" ")
    : typeof current === "string"
      ? current
      : "";
  return currentClass ? `${currentClass} ${next}` : next;
}
