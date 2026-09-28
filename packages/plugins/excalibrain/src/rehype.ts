import { createExcaliBrainPlaceholder } from "./placeholder.js";
import type { ElementNode, HastNode } from "./types.js";

export type RehypeExcaliBrainOptions = {
  language?: string;
};

/**
 * Replace every ` ```excalibrain ` code block with a placeholder div that is
 * resolved against the content manifest in `onManifestCreated`.
 */
export function rehypeExcaliBrain(options: RehypeExcaliBrainOptions = {}) {
  const language = options.language ?? "excalibrain";

  return (tree: HastNode) => {
    replaceBlocks(tree, language);
  };
}

function replaceBlocks(node: HastNode, language: string): void {
  const children = getChildren(node);
  if (!children) return;

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child === undefined) continue;

    if (isExcaliBrainBlock(child, language)) {
      children[index] = {
        type: "raw",
        value: createExcaliBrainPlaceholder(),
      };
      continue;
    }

    replaceBlocks(child, language);
  }
}

function isExcaliBrainBlock(node: HastNode, language: string): boolean {
  const element = asElement(node);
  if (element?.tagName !== "pre") return false;

  const code = getChildren(element)?.find(
    (child): child is ElementNode =>
      asElement(child)?.tagName === "code",
  );
  if (!code) return false;

  return classList(code).includes(`language-${language}`);
}

function asElement(node: HastNode): ElementNode | null {
  return node.type === "element" ? (node as ElementNode) : null;
}

function getChildren(node: HastNode): HastNode[] | null {
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? (children as HastNode[]) : null;
}

function classList(node: ElementNode): string[] {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/);
  return [];
}
