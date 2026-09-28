import {
  element,
  getStringProperty,
  getTextContent,
  hasClass,
  text,
  visitElements,
} from "./hast.js";
import type { ElementNode, HastNode, ParentNode, VegaLiteOptions } from "./types.js";

const DEFAULT_CLASS_NAME = "rb-vega-lite";
const DEFAULT_THEME = "light";
const DEFAULT_RENDERER = "canvas";
const VEGA_LITE_LANGUAGE_CLASS = "language-vega-lite";
const VEGA_LANGUAGE_CLASS = "language-vega";
const DIAGNOSTIC_SOURCE = "@riebeckite/plugin-vega-lite";

type ResolvedOptions = {
  className: string;
  caption: boolean;
  theme: string;
  renderer: string;
  actions: boolean | null;
};

/**
 * Replaces fenced `vega-lite` (and `vega`) code blocks with a figure carrying
 * the parsed specification. The chart is drawn in the browser by `initVegaLite`.
 */
export function rehypeVegaLite(options: VegaLiteOptions = {}) {
  const resolved: ResolvedOptions = {
    className: options.className?.trim() || DEFAULT_CLASS_NAME,
    caption: options.caption !== false,
    theme: options.theme ?? DEFAULT_THEME,
    renderer: options.renderer ?? DEFAULT_RENDERER,
    actions: options.actions ?? null,
  };

  return (tree: HastNode, file: unknown) => {
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || !isVegaLiteCodeBlock(node)) return;
      replaceVegaLiteBlock(parent, index, node, file, resolved);
    });
  };
}

function replaceVegaLiteBlock(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: ResolvedOptions,
) {
  const code = findDirectChild(pre, "code");
  const source = code ? getTextContent(code).trim() : getTextContent(pre).trim();
  const parsed = parseSpec(source);
  if (parsed.ok === false) {
    reportDiagnostic(file, parsed.message);
    return;
  }

  const captionText = options.caption
    ? extractCaption(pre, code, parsed.spec)
    : null;
  const label = captionText ?? "Vega-Lite chart";

  parent.children = parent.children ?? [];
  parent.children[index] = buildFigure({
    className: options.className,
    spec: parsed.spec,
    source,
    caption: captionText,
    label,
    theme: options.theme,
    renderer: options.renderer,
    actions: options.actions,
  });
}

function buildFigure(input: {
  className: string;
  spec: Record<string, unknown>;
  source: string;
  caption: string | null;
  label: string;
  theme: string;
  renderer: string;
  actions: boolean | null;
}): ElementNode {
  const base = input.className;
  const children: HastNode[] = [
    element(
      "div",
      {
        className: `${base}__canvas`,
        dataVegaLiteCanvas: "true",
        role: "img",
        ariaLabel: input.label,
      },
      [],
    ),
  ];
  if (input.caption) {
    children.push(
      element("figcaption", { className: `${base}__caption` }, [
        text(input.caption),
      ]),
    );
  }
  children.push(
    element("details", { className: `${base}__fallback` }, [
      element("summary", {}, [text("Vega-Lite spec")]),
      element("pre", {}, [element("code", {}, [text(input.source)])]),
    ]),
  );

  return element(
    "figure",
    {
      className: base,
      dataVegaLite: "pending",
      dataVegaLiteSpec: JSON.stringify(input.spec),
      dataVegaLiteTheme: input.theme,
      dataVegaLiteRenderer: input.renderer,
      dataVegaLiteActions:
        input.actions === null ? undefined : String(input.actions),
    },
    children,
  );
}

type ParseResult =
  | { ok: true; spec: Record<string, unknown> }
  | { ok: false; message: string };

function parseSpec(source: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    return { ok: false, message: `Invalid JSON: ${formatError(error)}` };
  }
  if (!isRecord(parsed)) {
    return { ok: false, message: "Expected a JSON object." };
  }
  return { ok: true, spec: parsed };
}

function extractCaption(
  pre: ElementNode,
  code: ElementNode | null,
  spec: Record<string, unknown>,
): string | null {
  const title =
    getStringProperty(pre, "title") ??
    (code ? getStringProperty(code, "title") : null);
  const value = title ?? readSpecTitle(spec.title);
  return value?.trim() || null;
}

function readSpecTitle(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.text === "string") return value.text;
  return null;
}

function isVegaLiteCodeBlock(node: ElementNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(
    code &&
      (hasClass(code, VEGA_LITE_LANGUAGE_CLASS) ||
        hasClass(code, VEGA_LANGUAGE_CLASS)),
  );
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
  const diagnostic = reporter.call(file, `Invalid Vega-Lite spec: ${message}`);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: DIAGNOSTIC_SOURCE,
      ruleId: "invalid-spec",
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
