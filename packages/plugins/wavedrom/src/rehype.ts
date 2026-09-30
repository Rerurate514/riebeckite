import {
  element,
  getStringProperty,
  getTextContent,
  hasClass,
  text,
  visitElements,
} from "./hast.js";
import type {
  ElementNode,
  HastNode,
  ParentNode,
  WavedromOptions,
  WavedromSkin,
} from "./types.js";

const DEFAULT_CLASS_NAME = "rb-wavedrom";
const DEFAULT_SKIN: WavedromSkin = "default";
const WAVEDROM_LANGUAGE_CLASSES = ["language-wavedrom", "language-wavejson"];

/**
 * Replaces every `wavedrom` (or `wavejson`) fenced code block with a figure
 * that carries the normalized WaveJSON in a data attribute. The diagram itself
 * is drawn in the browser by `initWaveDrom`.
 */
export function rehypeWavedrom(options: WavedromOptions = {}) {
  const className = options.className?.trim() || DEFAULT_CLASS_NAME;
  const skin = options.skin ?? DEFAULT_SKIN;
  const caption = options.caption !== false;
  const fallback = options.fallback !== false;

  return (tree: HastNode, file: unknown) => {
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || !isWavedromCodeBlock(node)) return;
      replaceWavedromBlock(parent, index, node, file, {
        className,
        skin,
        caption,
        fallback,
      });
    });
  };
}

function replaceWavedromBlock(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: {
    className: string;
    skin: WavedromSkin;
    caption: boolean;
    fallback: boolean;
  },
) {
  const code = findDirectChild(pre, "code");
  const source = code
    ? getTextContent(code).trim()
    : getTextContent(pre).trim();
  const parsed = parseSpec(source);
  if (isParseFailure(parsed)) {
    reportDiagnostic(file, parsed.message);
    return;
  }

  const captionText = options.caption
    ? (extractCaption(pre, code, parsed.caption) ?? null)
    : null;

  parent.children = parent.children ?? [];
  parent.children[index] = buildFigure({
    className: options.className,
    skin: options.skin,
    source,
    spec: parsed.spec,
    caption: captionText,
    fallback: options.fallback,
  });
}

function buildFigure(input: {
  className: string;
  skin: WavedromSkin;
  source: string;
  spec: Record<string, unknown>;
  caption: string | null;
  fallback: boolean;
}): ElementNode {
  const base = input.className;
  const labelId = `${base}-${hashSource(input.source)}-caption`;
  const serialized = JSON.stringify(input.spec);

  const children: HastNode[] = [];
  if (input.caption) {
    children.push(
      element("figcaption", { id: labelId, className: `${base}__caption` }, [
        text(input.caption),
      ]),
    );
  }
  children.push(
    element(
      "div",
      {
        className: `${base}__canvas`,
        dataWavedromCanvas: "true",
        role: "img",
        ariaLabelledby: input.caption ? labelId : undefined,
        ariaLabel: input.caption ? undefined : "WaveDrom timing diagram",
      },
      [],
    ),
  );
  if (input.fallback) {
    children.push(
      element("details", { className: `${base}__fallback` }, [
        element("summary", {}, [text("WaveJSON source")]),
        element("pre", {}, [element("code", {}, [text(input.source)])]),
      ]),
    );
  }

  return element(
    "figure",
    {
      className: base,
      dataWavedrom: "pending",
      dataWavedromSpec: serialized,
      dataWavedromSkin: input.skin,
    },
    children,
  );
}

type ParseResult =
  | { ok: true; spec: Record<string, unknown>; caption: string | null }
  | { ok: false; message: string };

function isParseFailure(
  result: ParseResult,
): result is { ok: false; message: string } {
  return result.ok === false;
}

/**
 * Parses a strict JSON WaveJSON object. A top-level `"caption"` key is pulled
 * out of the spec so it does not leak into the rendered diagram.
 */
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

  const { caption, ...spec } = parsed;
  if (!hasWaveDromBody(spec)) {
    return {
      ok: false,
      message:
        'Expected a WaveJSON object with a "signal", "assign", or "reg" property.',
    };
  }

  const captionText =
    typeof caption === "string" && caption.trim() !== ""
      ? caption.trim()
      : null;
  return { ok: true, spec, caption: captionText };
}

function hasWaveDromBody(spec: Record<string, unknown>): boolean {
  return (
    Array.isArray(spec.signal) || Array.isArray(spec.assign) || "reg" in spec
  );
}

function extractCaption(
  pre: ElementNode,
  code: ElementNode | null,
  fromSpec: string | null,
): string | undefined {
  const title =
    getStringProperty(pre, "title") ??
    (code ? getStringProperty(code, "title") : null);
  const value = title ?? fromSpec;
  return value?.trim() || undefined;
}

function isWavedromCodeBlock(node: ElementNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(
    code &&
      WAVEDROM_LANGUAGE_CLASSES.some((className) => hasClass(code, className)),
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
  const diagnostic = reporter.call(file, `Invalid WaveDrom config: ${message}`);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: "@riebeckite/plugin-wavedrom",
      ruleId: "invalid-config",
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hashSource(source: string): string {
  let hash = 0;
  for (const char of source) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash).toString(36);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
