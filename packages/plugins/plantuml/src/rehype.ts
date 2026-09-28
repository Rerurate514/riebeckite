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
  PlantumlErrorKind,
  PlantumlFormat,
  PlantumlOptions,
} from "./types.js";

const DEFAULT_SERVER = "https://www.plantuml.com/plantuml";
const DEFAULT_FORMAT: PlantumlFormat = "svg";
const CAPTION_PATTERN = /^%%\s*caption\s*:\s*(.+)$/im;
/**
 * Stable marker attribute so generated markup is easy to identify in tests and
 * downstream tooling. It is written on every rendered figure.
 */
const FIGURE_MARKER = "RIEBECKITE_EXTERNAL_PLANTUML_MARKER";

type ResolvedOptions = {
  server: string;
  format: PlantumlFormat;
  caption: boolean;
  fallback: boolean;
};

export function rehypePlantuml(options: PlantumlOptions = {}) {
  const resolved: ResolvedOptions = {
    server: normalizeServer(options.server ?? DEFAULT_SERVER),
    format: options.format ?? DEFAULT_FORMAT,
    caption: options.caption !== false,
    fallback: options.fallback !== false,
  };

  return async (tree: HastNode, file: unknown) => {
    const replacements: Promise<void>[] = [];
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || !isPlantumlCodeBlock(node)) return;
      replacements.push(
        replacePlantumlBlock(parent, index, node, file, resolved),
      );
    });
    await Promise.all(replacements);
  };
}

async function replacePlantumlBlock(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: ResolvedOptions,
) {
  const code = findDirectChild(pre, "code");
  const raw = (code ? getTextContent(code) : getTextContent(pre)).trim();
  const { caption, source } = options.caption
    ? resolveCaption(raw, pre, code)
    : { caption: null, source: raw };
  const imageUrl = await buildImageUrl(source, options, file);

  parent.children = parent.children ?? [];
  parent.children[index] = buildFigure({
    source,
    caption,
    imageUrl,
    fallback: options.fallback,
  });
}

async function buildImageUrl(
  source: string,
  options: ResolvedOptions,
  file: unknown,
): Promise<string | null> {
  if (source.length === 0) {
    reportPlantumlDiagnostic(
      file,
      "Empty PlantUML diagram source.",
      "empty-source",
    );
    return null;
  }

  try {
    const { encodePlantuml } = await import("./plantuml-encoder.js");
    const encoded = await encodePlantuml(source);
    return `${options.server}/${options.format}/${encoded}`;
  } catch (error) {
    const message = formatError(error);
    reportPlantumlDiagnostic(
      file,
      `PlantUML encoding failed: ${message}`,
      "encoder-error",
    );
    console.warn(`[plantuml] encoding failed: ${message}`);
    return null;
  }
}

function buildFigure(input: {
  source: string;
  caption: string | null;
  imageUrl: string | null;
  fallback: boolean;
}): ElementNode {
  const children: HastNode[] = [];

  children.push(
    element(
      "div",
      { className: "rb-plantuml__frame" },
      input.imageUrl
        ? [
            element("img", {
              className: "rb-plantuml__image",
              src: input.imageUrl,
              alt: input.caption ?? "PlantUML diagram",
              loading: "lazy",
            }),
          ]
        : [],
    ),
  );

  if (input.fallback) {
    children.push(
      element("details", { className: "rb-plantuml__fallback" }, [
        element("summary", {}, [text("Diagram source")]),
        element("pre", {}, [element("code", {}, [text(input.source)])]),
      ]),
    );
  }

  if (input.caption) {
    children.push(
      element("figcaption", { className: "rb-plantuml__caption" }, [
        text(input.caption),
      ]),
    );
  }

  return element(
    "figure",
    {
      className: "rb-plantuml",
      dataPlantuml: true,
      dataPlantumlMarker: FIGURE_MARKER,
      dataPlantumlSource: input.source,
    },
    children,
  );
}

function isPlantumlCodeBlock(node: ElementNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(code && hasClass(code, "language-plantuml"));
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

function resolveCaption(
  source: string,
  pre: ElementNode,
  code: ElementNode | null,
): { caption: string | null; source: string } {
  const title =
    getStringProperty(pre, "title") ?? getStringProperty(code ?? pre, "title");
  if (title?.trim()) return { caption: title.trim(), source };

  const match = source.match(CAPTION_PATTERN);
  if (!match) return { caption: null, source };

  return {
    caption: match[1].trim() || null,
    // `%%` is not PlantUML comment syntax, so the directive line is removed
    // before the diagram is encoded to keep the source valid.
    source: source.replace(CAPTION_PATTERN, "").trim(),
  };
}

function normalizeServer(server: string): string {
  return server.replace(/\/+$/, "");
}

function reportPlantumlDiagnostic(
  file: unknown,
  message: string,
  kind: PlantumlErrorKind,
) {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, message);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: "@riebeckite/plugin-plantuml",
      ruleId: kind,
    });
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
