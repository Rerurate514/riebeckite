import {
  element,
  getStringProperty,
  getTextContent,
  hasClass,
  text,
  visitElements,
} from "./hast.js";
import type {
  D2BuildRenderErrorKind,
  D2BuildRenderResult,
  D2Layout,
  D2Options,
  D2RenderMode,
  D2Theme,
  ElementNode,
  HastNode,
  ParentNode,
} from "./types.js";

const DEFAULT_THEME: NonNullable<D2Theme> = { light: 0, dark: 1 };
const DEFAULT_CLASS_NAME = "rb-d2";
const DEFAULT_LAYOUT: D2Layout = "dagre";
const CAPTION_PATTERN = /^#\s*caption\s*:\s*(.+)$/im;

type ResolvedOptions = {
  render: D2RenderMode;
  theme: NonNullable<D2Theme>;
  layout: D2Layout;
  caption: boolean;
  fallback: boolean;
  className: string;
};

export function rehypeD2(options: D2Options = {}) {
  const resolved: ResolvedOptions = {
    render: options.render ?? "build",
    theme: options.theme ?? DEFAULT_THEME,
    layout: options.layout ?? DEFAULT_LAYOUT,
    caption: options.caption !== false,
    fallback: options.fallback !== false,
    className: options.className?.trim() || DEFAULT_CLASS_NAME,
  };

  return async (tree: HastNode, file: unknown) => {
    const replacements: Promise<void>[] = [];
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || !isD2CodeBlock(node)) return;
      replacements.push(replaceD2Block(parent, index, node, file, resolved));
    });
    await Promise.all(replacements);
  };
}

async function replaceD2Block(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: ResolvedOptions,
) {
  const code = findDirectChild(pre, "code");
  const rawSource = code
    ? getTextContent(code).trim()
    : getTextContent(pre).trim();
  const { caption, body: source } = extractCaption(rawSource, pre, code);
  const id = `rr-d2-${hashSource(source)}`;
  const renderResult = shouldRenderAtBuild(options.render)
    ? await renderStaticSvg(id, source, options.theme, options.layout, file)
    : null;
  const staticSvg = renderResult?.ok ? renderResult.svg : null;

  parent.children = parent.children ?? [];
  parent.children[index] = buildFigure({
    className: options.className,
    id,
    source,
    caption: options.caption ? caption : null,
    layout: options.layout,
    staticSvg,
    fallback: options.fallback,
    clientFallback:
      shouldRenderAtClient(options.render) || renderResult?.ok === false,
  });
}

function buildFigure(input: {
  className: string;
  id: string;
  source: string;
  caption: string | null;
  layout: D2Layout;
  staticSvg: string | null;
  fallback: boolean;
  clientFallback: boolean;
}): ElementNode {
  const base = input.className;
  const labelId = `${input.id}-caption`;
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
        dataD2Canvas: "true",
        role: "img",
        ariaLabelledby: input.caption ? labelId : undefined,
        ariaLabel: input.caption ? undefined : "D2 diagram",
      },
      input.staticSvg ? [{ type: "raw", value: input.staticSvg }] : [],
    ),
  );
  if (input.fallback) {
    children.push(
      element("details", { className: `${base}__fallback` }, [
        element("summary", {}, [text("Diagram source")]),
        element("pre", {}, [element("code", {}, [text(input.source)])]),
      ]),
    );
  }
  return element(
    "figure",
    {
      className: base,
      dataD2: input.staticSvg ? "rendered" : "pending",
      dataD2Source: input.source,
      dataD2Layout: input.layout,
    },
    children,
  );
}

async function renderStaticSvg(
  id: string,
  source: string,
  theme: NonNullable<D2Theme>,
  layout: D2Layout,
  file: unknown,
): Promise<D2BuildRenderResult> {
  try {
    const { renderD2StaticSvg } = await import("./render-static.js");
    const result = await renderD2StaticSvg(id, source, {
      themeID: selectTheme(theme, "light"),
      layout,
    });
    if (result.ok === false) {
      reportD2Diagnostic(file, result.message, result.kind);
      const label =
        result.kind === "invalid-diagram"
          ? "invalid diagram"
          : "renderer failed";
      console.warn(`[d2] ${label}: ${result.message}`);
    }
    return result;
  } catch (error) {
    const message = formatError(error);
    reportD2Diagnostic(file, message, "renderer-error");
    console.warn(`[d2] renderer failed: ${message}`);
    return { ok: false, kind: "renderer-error", message };
  }
}

function reportD2Diagnostic(
  file: unknown,
  message: string,
  kind: D2BuildRenderErrorKind,
) {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(
    file,
    kind === "invalid-diagram"
      ? `Invalid D2 diagram: ${message}`
      : `D2 renderer failed: ${message}`,
  );
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: "@riebeckite/plugin-d2",
      ruleId: kind,
    });
  }
}

function isD2CodeBlock(node: ElementNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(code && hasClass(code, "language-d2"));
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

function extractCaption(
  source: string,
  pre: ElementNode,
  code: ElementNode | null,
): { caption: string | null; body: string } {
  const title =
    getStringProperty(pre, "title") ?? getStringProperty(code ?? pre, "title");
  const match = CAPTION_PATTERN.exec(source);
  const caption = title ?? match?.[1] ?? null;
  const body = match
    ? `${source.slice(0, match.index)}${source.slice(match.index + match[0].length)}`
    : source;
  return { caption: caption?.trim() || null, body: body.trim() };
}

function shouldRenderAtBuild(render: D2RenderMode): boolean {
  return render === "build";
}

function shouldRenderAtClient(render: D2RenderMode): boolean {
  return render === "client";
}

function selectTheme(
  theme: NonNullable<D2Theme>,
  mode: "light" | "dark",
): number {
  return typeof theme === "number" ? theme : theme[mode];
}

function hashSource(source: string): string {
  let hash = 0;
  for (const char of source) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash).toString(36);
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
