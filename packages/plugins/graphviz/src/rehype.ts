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
  GraphvizBuildRenderErrorKind,
  GraphvizBuildRenderResult,
  GraphvizEngine,
  GraphvizOptions,
  HastNode,
  ParentNode,
} from "./types.js";

const DEFAULT_CLASS_NAME = "rb-graphviz";
const DEFAULT_ENGINE: GraphvizEngine = "dot";

/**
 * Caption conventions, mirroring the mermaid/d2 plugins:
 * - the fenced block `title` (or the inner `<code>`'s title)
 * - a leading Graphviz line comment: `// caption: ...`
 * - a leading Graphviz block comment: `caption:` inside a slash-star comment
 */
const CAPTION_PATTERNS = [
  /^\s*\/\/\s*caption\s*:\s*(.+)$/im,
  /^\s*\/\*\s*caption\s*:\s*(.+?)\s*\*\/\s*$/im,
];

export function rehypeGraphviz(options: GraphvizOptions = {}) {
  const renderMode = options.render ?? "build";
  const engine = normalizeEngine(options.engine);
  const className = options.className?.trim() || DEFAULT_CLASS_NAME;

  return async (tree: HastNode, file: unknown) => {
    const replacements: Promise<void>[] = [];
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || !isGraphvizCodeBlock(node)) return;
      replacements.push(
        replaceGraphvizBlock(parent, index, node, file, {
          render: renderMode,
          engine,
          className,
          caption: options.caption !== false,
          fallback: options.fallback !== false,
        }),
      );
    });
    await Promise.all(replacements);
  };
}

async function replaceGraphvizBlock(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: {
    render: NonNullable<GraphvizOptions["render"]>;
    engine: GraphvizEngine;
    className: string;
    caption: boolean;
    fallback: boolean;
  },
) {
  const code = findDirectChild(pre, "code");
  const source = code
    ? getTextContent(code).trim()
    : getTextContent(pre).trim();
  const caption = options.caption ? extractCaption(source, pre, code) : null;
  const id = `rr-graphviz-${hashSource(source)}`;

  const buildEnabled = options.render === "build" || options.render === "both";
  const clientEnabled = options.render === "client" || options.render === "both";
  const renderResult = buildEnabled
    ? await renderStaticSvg(source, options.engine, file)
    : null;
  const staticSvg = renderResult?.ok ? renderResult.svg : null;
  const clientFallback = clientEnabled || renderResult?.ok === false;

  parent.children = parent.children ?? [];
  parent.children[index] = buildFigure({
    id,
    source,
    caption,
    staticSvg,
    fallback: options.fallback,
    className: options.className,
    engine: options.engine,
    status: staticSvg ? "rendered" : clientFallback ? "pending" : "error",
  });
}

function buildFigure(input: {
  id: string;
  source: string;
  caption: string | null;
  staticSvg: string | null;
  fallback: boolean;
  className: string;
  engine: GraphvizEngine;
  status: "rendered" | "pending" | "error";
}): ElementNode {
  const labelId = `${input.id}-caption`;
  const children: HastNode[] = [];
  if (input.caption) {
    children.push(
      element(
        "figcaption",
        { id: labelId, className: `${input.className}__caption` },
        [text(input.caption)],
      ),
    );
  }
  children.push(
    element(
      "div",
      {
        className: `${input.className}__canvas`,
        dataGraphvizCanvas: "true",
        role: "img",
        ariaLabelledby: input.caption ? labelId : undefined,
        ariaLabel: input.caption ? undefined : "Graphviz diagram",
      },
      input.staticSvg ? [{ type: "raw", value: input.staticSvg }] : [],
    ),
  );
  if (input.fallback) {
    children.push(
      element("details", { className: `${input.className}__fallback` }, [
        element("summary", {}, [text("Diagram source")]),
        element("pre", {}, [element("code", {}, [text(input.source)])]),
      ]),
    );
  }
  return element(
    "figure",
    {
      className: input.className,
      dataGraphviz: input.status,
      dataGraphvizEngine: input.engine,
      dataGraphvizSource: input.source,
    },
    children,
  );
}

async function renderStaticSvg(
  source: string,
  engine: GraphvizEngine,
  file: unknown,
): Promise<GraphvizBuildRenderResult> {
  try {
    const { renderGraphvizStaticSvg } = await import("./render-static.js");
    const result = await renderGraphvizStaticSvg(source, engine);
    if (result.ok === false) {
      reportGraphvizDiagnostic(file, result.message, result.kind);
      console.warn(`[graphviz] ${result.kind}: ${result.message}`);
    }
    return result;
  } catch (error) {
    const message = formatError(error);
    reportGraphvizDiagnostic(file, message, "renderer-error");
    console.warn(`[graphviz] renderer failed: ${message}`);
    return { ok: false, kind: "renderer-error", message };
  }
}

function reportGraphvizDiagnostic(
  file: unknown,
  message: string,
  kind: GraphvizBuildRenderErrorKind,
) {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(
    file,
    kind === "invalid-diagram"
      ? `Invalid Graphviz diagram: ${message}`
      : `Graphviz renderer failed: ${message}`,
  );
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: "@riebeckite/plugin-graphviz",
      ruleId: kind,
    });
  }
}

function isGraphvizCodeBlock(node: ElementNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(
    code &&
      (hasClass(code, "language-dot") || hasClass(code, "language-graphviz")),
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

function extractCaption(
  source: string,
  pre: ElementNode,
  code: ElementNode | null,
): string | null {
  const title =
    getStringProperty(pre, "title") ?? getStringProperty(code ?? pre, "title");
  if (title?.trim()) return title.trim();
  for (const pattern of CAPTION_PATTERNS) {
    const match = source.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function normalizeEngine(engine: GraphvizOptions["engine"]): GraphvizEngine {
  return engine === "neato" ||
    engine === "fdp" ||
    engine === "sfdp" ||
    engine === "circo" ||
    engine === "twopi"
    ? engine
    : DEFAULT_ENGINE;
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
