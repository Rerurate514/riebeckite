import { resolveMarkmapOptions } from "./options.js";
import { describeMarkmapTree, parseMarkmapSource } from "./parse.js";
import type {
  ElementNode,
  HastNode,
  MarkmapOptions,
  MarkmapResolvedOptions,
  ParentNode,
  TextNode,
} from "./types.js";

const DIAGNOSTIC_SOURCE = "@riebeckite/plugin-markmap";

/**
 * Replaces every fenced `markmap` code block with a figure that carries the
 * raw Markdown in `data-markmap-source`. The mindmap itself is drawn in the
 * browser by `initMarkmap`.
 */
export function rehypeMarkmap(options: MarkmapOptions = {}) {
  const resolved = resolveMarkmapOptions(options);

  return (tree: HastNode, file: unknown) => {
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined) return;
      if (!isMarkmapCodeBlock(node, resolved.language)) return;
      replaceMarkmapBlock(parent, index, node, file, resolved);
    });
  };
}

function replaceMarkmapBlock(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: MarkmapResolvedOptions,
) {
  const code = findDirectChild(pre, "code");
  const source = code
    ? getTextContent(code).trim()
    : getTextContent(pre).trim();
  const tree = parseMarkmapSource(source);
  if (tree === null) {
    reportDiagnostic(file, "Expected at least one Markdown heading.");
    return;
  }

  const caption = options.caption ? extractCaption(pre, code) : null;
  const label = caption ?? describeMarkmapTree(tree);

  parent.children = parent.children ?? [];
  parent.children[index] = buildFigure({
    className: options.className,
    source,
    caption,
    label: label || "Mind map",
    height: options.height,
    fallback: options.fallback,
    colorFreezeLevel: options.colorFreezeLevel,
  });
}

function buildFigure(input: {
  className: string;
  source: string;
  caption: string | null;
  label: string;
  height: number;
  fallback: boolean;
  colorFreezeLevel: number | null;
}): ElementNode {
  const base = input.className;
  const labelId = `${base}-caption`;
  const children: HastNode[] = [
    element(
      "div",
      {
        className: `${base}__canvas`,
        dataMarkmapCanvas: "true",
        role: "img",
        ariaLabelledby: input.caption ? labelId : undefined,
        ariaLabel: input.caption ? undefined : input.label,
      },
      [],
    ),
  ];

  if (input.caption) {
    children.push(
      element("figcaption", { id: labelId, className: `${base}__caption` }, [
        text(input.caption),
      ]),
    );
  }

  if (input.fallback) {
    children.push(
      element("details", { className: `${base}__fallback` }, [
        element("summary", {}, [text("Markdown source")]),
        element("pre", {}, [element("code", {}, [text(input.source)])]),
      ]),
    );
  }

  return element(
    "figure",
    {
      className: base,
      dataMarkmap: "pending",
      dataMarkmapSource: input.source,
      dataMarkmapHeight: String(input.height),
      dataMarkmapColorFreezeLevel:
        input.colorFreezeLevel === null
          ? undefined
          : String(input.colorFreezeLevel),
    },
    children,
  );
}

function extractCaption(
  pre: ElementNode,
  code: ElementNode | null,
): string | null {
  const title =
    getStringProperty(pre, "title") ??
    (code ? getStringProperty(code, "title") : null);
  return title?.trim() || null;
}

function isMarkmapCodeBlock(node: ElementNode, language: string): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(code && hasClass(code, `language-${language}`));
}

function findDirectChild(
  node: ElementNode,
  tagName: string,
): ElementNode | null {
  return (
    node.children?.find(
      (child): child is ElementNode =>
        child.type === "element" && child.tagName === tagName,
    ) ?? null
  );
}

function reportDiagnostic(file: unknown, message: string) {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(
    file,
    `Invalid Markmap source: ${message}`,
  );
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: DIAGNOSTIC_SOURCE,
      ruleId: "invalid-source",
    });
  }
}

function visitElements(
  node: HastNode,
  visitor: (node: ElementNode, parent?: ParentNode, index?: number) => void,
  parent?: ParentNode,
  index?: number,
) {
  if (isElementNode(node)) visitor(node, parent, index);

  for (const [childIndex, child] of [...getChildren(node)].entries()) {
    visitElements(child, visitor, hasChildren(node) ? node : parent, childIndex);
  }
}

function element(
  tagName: string,
  properties: Record<string, unknown> = {},
  children: HastNode[] = [],
): ElementNode {
  return { type: "element", tagName, properties, children };
}

function text(value: string): TextNode {
  return { type: "text", value };
}

function getTextContent(node: HastNode): string {
  if (
    node.type === "text" &&
    "value" in node &&
    typeof node.value === "string"
  ) {
    return node.value;
  }
  return getChildren(node).map(getTextContent).join("");
}

function getStringProperty(
  node: ElementNode,
  key: string,
): string | null {
  const value = node.properties?.[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" ");
  return null;
}

function hasClass(node: ElementNode, className: string): boolean {
  const value = node.properties?.className;
  const classes = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  return classes.includes(className);
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
