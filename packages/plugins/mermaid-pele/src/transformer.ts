import { renderPeleSvg } from "./renderer.js";
import type { HastNode, MermaidPeleOptions } from "./types.js";

const PELE_RENDERER = "pele";

export class MermaidRendererConflictError extends Error {
  constructor() {
    super(
      "@riebeckite/plugin-mermaid and @riebeckite/plugin-mermaid-pele cannot be enabled together. Enable exactly one Mermaid renderer.",
    );
    this.name = "MermaidRendererConflictError";
  }
}

export function rehypeMermaidPele(_options: MermaidPeleOptions = {}) {
  return (tree: unknown, file: unknown): void => {
    const root = tree as HastNode;
    if (hasOtherMermaidRenderer(root)) throw new MermaidRendererConflictError();

    let diagramIndex = 0;
    visit(root, (node, parent, index) => {
      if (!parent || index === undefined || !isMermaidCodeBlock(node)) return;
      const source = getText(node).trim();
      const id = `rr-mermaid-pele-${hash(source)}-${diagramIndex++}`;
      const result = renderPeleSvg(source, id);
      if (result.ok === false) reportDiagnostic(file, result.message);
      parent.children ??= [];
      parent.children[index] = createFigure(source, result, id);
    });
  };
}

function createFigure(
  source: string,
  result: ReturnType<typeof renderPeleSvg>,
  id: string,
): HastNode {
  const canvasChildren: HastNode[] =
    result.ok === true
      ? [{ type: "raw", value: result.svg }]
      : [
          {
            type: "element",
            tagName: "pre",
            properties: { className: ["rr-mermaid-pele__error"] },
            children: [{ type: "text", value: result.message }],
          },
        ];
  return {
    type: "element",
    tagName: "figure",
    properties: {
      className: ["rr-mermaid-pele"],
      dataRiebeckiteMermaidRenderer: PELE_RENDERER,
    },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: {
          className: ["rr-mermaid-pele__canvas"],
          role: "img",
          ariaLabel:
            result.ok === true ? "Mermaid diagram" : "Mermaid diagram error",
          id,
        },
        children: canvasChildren,
      },
      {
        type: "element",
        tagName: "details",
        properties: { className: ["rr-mermaid-pele__fallback"] },
        children: [
          {
            type: "element",
            tagName: "summary",
            properties: {},
            children: [{ type: "text", value: "Diagram source" }],
          },
          {
            type: "element",
            tagName: "pre",
            properties: {},
            children: [
              {
                type: "element",
                tagName: "code",
                properties: {},
                children: [{ type: "text", value: source }],
              },
            ],
          },
        ],
      },
    ],
  };
}

function hasOtherMermaidRenderer(root: HastNode): boolean {
  let found = false;
  visit(root, (node) => {
    if (node.properties?.dataRiebeckiteMermaidRenderer === "mermaid") {
      found = true;
    }
  });
  return found;
}

function isMermaidCodeBlock(node: HastNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = node.children?.find((child) => child.tagName === "code");
  const classes = code?.properties?.className;
  return Array.isArray(classes) && classes.includes("language-mermaid");
}

function getText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(getText).join("");
}

function visit(
  node: HastNode,
  callback: (node: HastNode, parent?: HastNode, index?: number) => void,
  parent?: HastNode,
  index?: number,
): void {
  callback(node, parent, index);
  for (const [childIndex, child] of (node.children ?? []).entries()) {
    visit(child, callback, node, childIndex);
  }
}

function reportDiagnostic(file: unknown, message: string): void {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(
    file,
    `Pele could not render diagram: ${message}`,
  );
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: "@riebeckite/plugin-mermaid-pele",
      ruleId: "invalid-diagram",
    });
  }
}

function hash(value: string): string {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(result).toString(36);
}
