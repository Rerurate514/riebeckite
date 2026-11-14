import type { Node } from "unist";
import { safeMarkdownStyle } from "./markdown_sanitize_schema.js";
import type { RiebeckitePlugin } from "./types/plugin.js";

export function sanitizeMarkdownStyles() {
  return (tree: Node) => {
    removeUnsafeMarkdownStyles(tree as HtmlNode);
  };
}

export function sanitizeMarkdownObjects() {
  return (tree: Node) => {
    removeUnsafeMarkdownObjects(tree as HtmlNode);
  };
}

export const footnoteClobberPrefix =
  /^user-content-((?:fn|fnref|footnote-label).*)$/;

export function dedupeFootnoteClobberPrefix() {
  return (tree: Node) => {
    removeFootnoteClobberPrefix(tree as HtmlNode);
  };
}

export function removeFootnoteClobberPrefix(node: HtmlNode): void {
  const properties = node.properties;
  if (properties) {
    for (const property of ["id", "name", "ariaDescribedBy"] as const) {
      const value = properties[property];
      if (typeof value !== "string") continue;
      const match = footnoteClobberPrefix.exec(value);
      if (match) properties[property] = match[1];
    }
  }
  for (const child of node.children ?? []) {
    removeFootnoteClobberPrefix(child as HtmlNode);
  }
}

export function removeUnsafeMarkdownStyles(node: HtmlNode): void {
  if (
    typeof node.properties?.style === "string" &&
    !safeMarkdownStyle.test(node.properties.style)
  ) {
    delete node.properties.style;
  }
  for (const child of node.children ?? []) {
    removeUnsafeMarkdownStyles(child as HtmlNode);
  }
}

export function removeUnsafeMarkdownObjects(node: HtmlNode): void {
  if (node.tagName === "object") {
    const data = node.properties?.data;
    const type = node.properties?.type;
    if (
      typeof data !== "string" ||
      !isLocalUrl(data) ||
      type !== "application/pdf"
    ) {
      delete node.properties?.data;
      delete node.properties?.type;
    }
  }
  for (const child of node.children ?? []) {
    removeUnsafeMarkdownObjects(child as HtmlNode);
  }
}

export function isLocalUrl(value: string): boolean {
  const normalized = value.trim();
  return (
    !normalized.startsWith("//") && !/^[a-z][a-z\d+.-]*:/i.test(normalized)
  );
}

export type HtmlNode = Node & {
  children?: Node[];
  properties?: Record<string, unknown>;
  tagName?: string;
};

export function isPluginTable(node: HtmlNode): boolean {
  const className = node.properties?.className;
  const names = Array.isArray(className) ? className : [className];
  return names.some(
    (name) =>
      typeof name === "string" &&
      (name.startsWith("rb-") || name.startsWith("rr-")),
  );
}

export function wrapMarkdownTables() {
  return (tree: Node) => {
    wrapTableChildren(tree as HtmlNode);
  };
}

export function wrapTableChildren(parent: HtmlNode): void {
  if (!parent.children) return;
  parent.children = parent.children.map((child) => {
    const node = child as HtmlNode;
    if (
      node.type === "element" &&
      node.tagName === "table" &&
      !isPluginTable(node)
    ) {
      return {
        type: "element",
        tagName: "div",
        properties: { className: ["rb-table-scroll"] },
        children: [child],
      } as Node;
    }
    wrapTableChildren(node);
    return child;
  });
}

export function assertUniqueDerivedViewIds(
  plugins: readonly RiebeckitePlugin[],
): void {
  const owners = new Map<string, string>();
  for (const plugin of plugins) {
    for (const view of plugin.derivedViews ?? []) {
      const previous = owners.get(view.id);
      if (previous) {
        throw new Error(
          `Derived View "${view.id}" is declared by both "${previous}" and "${plugin.name}".`,
        );
      }
      owners.set(view.id, plugin.name);
    }
  }
}
