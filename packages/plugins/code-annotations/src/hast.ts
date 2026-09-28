import type { ElementNode, HastNode, TextNode } from "./types.js";

export function isElementNode(node: HastNode): node is ElementNode {
  return node.type === "element";
}

export function text(value: string): TextNode {
  return { type: "text", value };
}

export function element(
  tagName: string,
  properties: Record<string, unknown> = {},
  children: HastNode[] = [],
): ElementNode {
  return { type: "element", tagName, properties, children };
}

export function visitElementTree(
  node: HastNode,
  visitor: (node: ElementNode, ancestors: ElementNode[]) => void,
  ancestors: ElementNode[] = [],
): void {
  if (isElementNode(node)) {
    visitor(node, ancestors);
  }

  const nextAncestors = isElementNode(node) ? [...ancestors, node] : ancestors;
  for (const child of getChildren(node)) {
    visitElementTree(child, visitor, nextAncestors);
  }
}

export function getStringProperty(
  node: ElementNode,
  key: string,
): string | null {
  const value = getProperty(node, key);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" ");
  return null;
}

export function getBooleanProperty(node: ElementNode, key: string): boolean {
  const value = getProperty(node, key);
  return value === true || value === "true" || value === "";
}

export function hasProperty(node: ElementNode, key: string): boolean {
  return getProperty(node, key) !== undefined;
}

export function getClassNameList(node: ElementNode): string[] {
  const value = node.properties?.className;
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") {
    return value.split(/\s+/).filter(Boolean);
  }
  return [];
}

export function mergeClassName(current: unknown, next: string): string {
  const currentClass = Array.isArray(current)
    ? current.join(" ")
    : typeof current === "string"
      ? current
      : "";
  if (next === "") return currentClass;
  return currentClass ? `${currentClass} ${next}` : next;
}

export function getDataMeta(node: ElementNode): string | null {
  const data = node.data;
  if (data === null || typeof data !== "object") return null;
  const meta = (data as { meta?: unknown }).meta;
  return typeof meta === "string" ? meta : null;
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

function getProperty(node: ElementNode, key: string): unknown {
  const value = node.properties?.[key];
  if (value !== undefined) return value;
  const hyphenated = key.replace(
    /[A-Z]/g,
    (match) => `-${match.toLowerCase()}`,
  );
  if (hyphenated !== key) return node.properties?.[hyphenated];
  return undefined;
}

function getChildren(node: HastNode): HastNode[] {
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? (children as HastNode[]) : [];
}
