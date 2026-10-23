import type { DiagramBlock, DiagramNode } from "./types.js";

export function findDiagramBlocks(
  tree: DiagramNode,
  options: { languages: readonly string[] },
): DiagramBlock[] {
  const languages = new Set(options.languages);
  const blocks: DiagramBlock[] = [];
  visit(tree, (node, parent, index) => {
    if (!parent || index === undefined || node.tagName !== "pre") return;
    const code = node.children?.find(isCode);
    const language = code ? findLanguage(code) : null;
    if (!code || !language || !languages.has(language)) return;
    blocks.push({
      pre: node,
      code,
      parent,
      index,
      source: getTextContent(code).trim(),
      language,
    });
  });
  return blocks;
}

export function getTextContent(node: DiagramNode): string {
  if (node.type === "text" && typeof node.value === "string") return node.value;
  return (node.children ?? []).map(getTextContent).join("");
}

export function visitElements(
  node: DiagramNode,
  visitor: (node: DiagramNode, parent?: DiagramNode, index?: number) => void,
  parent?: DiagramNode,
  index?: number,
): void {
  if (node.type === "element") visitor(node, parent, index);
  for (const [childIndex, child] of [...(node.children ?? [])].entries())
    visitElements(child, visitor, node, childIndex);
}

export function stringProperty(node: DiagramNode, key: string): string | null {
  const value = node.properties?.[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" ");
  return null;
}

export const getStringProperty = stringProperty;

export function hasClass(node: DiagramNode, className: string): boolean {
  const value = node.properties?.className;
  const classes = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  return classes.includes(className);
}

export function mergeClassName(current: unknown, next: string): string {
  const value = Array.isArray(current)
    ? current.join(" ")
    : typeof current === "string"
      ? current
      : "";
  return value ? `${value} ${next}` : next;
}

export function element(
  tagName: string,
  properties: Record<string, unknown> = {},
  children: DiagramNode[] = [],
): DiagramNode {
  return { type: "element", tagName, properties, children };
}

export function text(value: string): DiagramNode {
  return { type: "text", value };
}

function visit(
  node: DiagramNode,
  visitor: (node: DiagramNode, parent?: DiagramNode, index?: number) => void,
  parent?: DiagramNode,
  index?: number,
): void {
  visitor(node, parent, index);
  for (const [childIndex, child] of [...(node.children ?? [])].entries())
    visit(child, visitor, node, childIndex);
}

function isCode(node: DiagramNode): boolean {
  return node.type === "element" && node.tagName === "code";
}

function findLanguage(node: DiagramNode): string | null {
  const value = node.properties?.className;
  const classes = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  return (
    classes
      .find((name) => name.startsWith("language-"))
      ?.slice("language-".length) ?? null
  );
}
