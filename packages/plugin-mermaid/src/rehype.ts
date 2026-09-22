import {
  element,
  getStringProperty,
  getTextContent,
  hasClass,
  text,
  visitElements,
} from "./hast.js";
import type { ElementNode, HastNode, MermaidOptions } from "./types.js";

const DEFAULT_THEME = { light: "default", dark: "dark" };
const CAPTION_PATTERN = /^%%\s*caption\s*:\s*(.+)$/im;
const STATIC_RENDERER_MODULE = "./render-static.js";

export function rehypeMermaid(options: MermaidOptions = {}) {
  const renderMode = options.render ?? "build";
  const theme = options.theme ?? DEFAULT_THEME;

  return async (tree: HastNode, file: unknown) => {
    const replacements: Promise<void>[] = [];
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || !isMermaidCodeBlock(node)) return;
      replacements.push(
        replaceMermaidBlock(parent, index, node, file, {
          render: renderMode,
          theme,
          caption: options.caption !== false,
          fallback: options.fallback !== false,
        }),
      );
    });
    await Promise.all(replacements);
  };
}

async function replaceMermaidBlock(
  parent: ElementNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: Required<MermaidOptions> & {
    theme: NonNullable<MermaidOptions["theme"]>;
  },
) {
  const code = findDirectChild(pre, "code");
  const source = code
    ? getTextContent(code).trim()
    : getTextContent(pre).trim();
  const caption = options.caption ? extractCaption(source, pre, code) : null;
  const id = `rr-mermaid-${hashSource(source)}`;
  const staticSvg = shouldRenderAtBuild(options.render)
    ? await renderStaticSvg(id, source, options.theme, file)
    : null;

  parent.children = parent.children ?? [];
  parent.children[index] = buildFigure({
    id,
    source,
    caption,
    staticSvg,
    fallback: options.fallback,
  });
}

function buildFigure(input: {
  id: string;
  source: string;
  caption: string | null;
  staticSvg: string | null;
  fallback: boolean;
}): ElementNode {
  const labelId = `${input.id}-caption`;
  const children: HastNode[] = [];
  if (input.caption) {
    children.push(
      element("figcaption", { id: labelId, className: "rr-mermaid__caption" }, [
        text(input.caption),
      ]),
    );
  }
  children.push(
    element(
      "div",
      {
        className: "rr-mermaid__canvas",
        role: "img",
        ariaLabelledby: input.caption ? labelId : undefined,
        ariaLabel: input.caption ? undefined : "Mermaid diagram",
      },
      input.staticSvg ? [{ type: "raw", value: input.staticSvg }] : [],
    ),
  );
  if (input.fallback) {
    children.push(
      element("details", { className: "rr-mermaid__fallback" }, [
        element("summary", {}, [text("Diagram source")]),
        element("pre", {}, [element("code", {}, [text(input.source)])]),
      ]),
    );
  }
  return element(
    "figure",
    {
      className: "rr-mermaid",
      dataMermaid: input.staticSvg ? undefined : "pending",
      dataMermaidSource: input.source,
    },
    children,
  );
}

async function renderStaticSvg(
  id: string,
  source: string,
  theme: NonNullable<MermaidOptions["theme"]>,
  file: unknown,
): Promise<string | null> {
  try {
    const { renderMermaidStaticSvg } = await import(STATIC_RENDERER_MODULE);
    return await renderMermaidStaticSvg(id, source, selectTheme(theme, "light"));
  } catch (error) {
    const message = formatError(error);
    reportMermaidDiagnostic(file, message);
    console.warn(`[mermaid] build render failed: ${message}`);
    return null;
  }
}

function reportMermaidDiagnostic(file: unknown, message: string) {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, `Invalid Mermaid diagram: ${message}`);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: "@riebeckite/plugin-mermaid",
      ruleId: "invalid-mermaid",
    });
  }
}

function isMermaidCodeBlock(node: ElementNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(code && hasClass(code, "language-mermaid"));
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
  const caption = title ?? source.match(CAPTION_PATTERN)?.[1];
  return caption?.trim() || null;
}

function shouldRenderAtBuild(render: MermaidOptions["render"]): boolean {
  return render === "build" || render === "both" || render === undefined;
}

function selectTheme(
  theme: NonNullable<MermaidOptions["theme"]>,
  mode: "light" | "dark",
): string {
  return typeof theme === "string" ? theme : theme[mode];
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
