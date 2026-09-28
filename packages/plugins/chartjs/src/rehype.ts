import { escapeHtmlAttribute } from "@riebeckite/core";
import {
  element,
  getStringProperty,
  getTextContent,
  hasClass,
  text,
  visitElements,
} from "./hast.js";
import type { ChartJsOptions, ElementNode, HastNode, ParentNode } from "./types.js";

const DEFAULT_CLASS_NAME = "rb-chartjs";
const CHART_LANGUAGE_CLASS = "language-chart";
/**
 * Stable hook emitted on every generated figure. It lets consumers (and the
 * external build fixture) detect Chart.js output without parsing the JSON.
 */
const FIGURE_MARKER = "RIEBECKITE_EXTERNAL_CHARTJS_MARKER";

export function rehypeChartJs(options: ChartJsOptions = {}) {
  const className = options.className ?? DEFAULT_CLASS_NAME;
  const responsive = options.responsive !== false;
  const caption = options.caption !== false;

  return (tree: HastNode, file: unknown) => {
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || !isChartCodeBlock(node)) return;
      replaceChartBlock(parent, index, node, file, {
        className,
        responsive,
        caption,
      });
    });
  };
}

function replaceChartBlock(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: { className: string; responsive: boolean; caption: boolean },
) {
  const code = findDirectChild(pre, "code");
  const source = code ? getTextContent(code).trim() : getTextContent(pre).trim();
  const parsed = parseChartConfig(source);
  if (isParseFailure(parsed)) {
    reportDiagnostic(file, parsed.message);
    return;
  }

  applyResponsiveDefault(parsed.config, options.responsive);
  const captionText = options.caption
    ? (extractCaption(pre, code, parsed.caption) ?? null)
    : null;
  const label = captionText ?? `Chart: ${String(parsed.config.type)}`;

  parent.children = parent.children ?? [];
  parent.children[index] = buildFigure({
    className: options.className,
    config: parsed.config,
    caption: captionText,
    label,
  });
}

function buildFigure(input: {
  className: string;
  config: Record<string, unknown>;
  caption: string | null;
  label: string;
}): ElementNode {
  const canvasClass = `${input.className}__canvas`;
  const captionClass = `${input.className}__caption`;
  const serialized = JSON.stringify(input.config);
  const canvasAttributes = [
    `class="${escapeHtmlAttribute(canvasClass)}"`,
    `data-chartjs-config="${escapeHtmlAttribute(serialized)}"`,
    `role="img"`,
    `aria-label="${escapeHtmlAttribute(input.label)}"`,
  ].join(" ");

  const children: HastNode[] = [
    { type: "raw", value: `<canvas ${canvasAttributes}></canvas>` },
  ];
  if (input.caption) {
    children.push(
      element("figcaption", { className: captionClass }, [text(input.caption)]),
    );
  }

  return element(
    "figure",
    {
      className: input.className,
      dataChartjsMarker: FIGURE_MARKER,
    },
    children,
  );
}

type ParseResult =
  | { ok: true; config: Record<string, unknown>; caption: string | null }
  | { ok: false; message: string };

function isParseFailure(
  result: ParseResult,
): result is { ok: false; message: string } {
  return result.ok === false;
}

function parseChartConfig(source: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    return { ok: false, message: `Invalid JSON: ${formatError(error)}` };
  }
  if (!isRecord(parsed)) {
    return { ok: false, message: "Expected a JSON object." };
  }

  const { caption, ...rest } = parsed;
  if (typeof rest.type !== "string" || rest.type.trim() === "") {
    return {
      ok: false,
      message: 'Missing "type" (a Chart.js chart type such as "bar").',
    };
  }

  const captionText =
    typeof caption === "string" && caption.trim() !== "" ? caption.trim() : null;

  if (isRecord(rest.data)) {
    if (
      !Array.isArray(rest.data.labels) ||
      !Array.isArray(rest.data.datasets)
    ) {
      return {
        ok: false,
        message: 'Expected "data.labels" and "data.datasets" arrays.',
      };
    }
    return { ok: true, config: rest, caption: captionText };
  }

  if (Array.isArray(rest.labels) && Array.isArray(rest.datasets)) {
    const { labels, datasets, ...options } = rest;
    const config: Record<string, unknown> = {
      type: rest.type,
      data: { labels, datasets },
      ...options,
    };
    return { ok: true, config, caption: captionText };
  }

  return {
    ok: false,
    message:
      'Expected a full Chart.js config ("data") or shorthand ("labels" and "datasets").',
  };
}

function applyResponsiveDefault(
  config: Record<string, unknown>,
  responsive: boolean,
) {
  if (!isRecord(config.options)) {
    config.options = { responsive };
    return;
  }
  if (config.options.responsive === undefined) {
    config.options.responsive = responsive;
  }
}

function extractCaption(
  pre: ElementNode,
  code: ElementNode | null,
  fromConfig: string | null,
): string | undefined {
  const title =
    getStringProperty(pre, "title") ??
    (code ? getStringProperty(code, "title") : null);
  const value = title ?? fromConfig;
  return value?.trim() || undefined;
}

function isChartCodeBlock(node: ElementNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(code && hasClass(code, CHART_LANGUAGE_CLASS));
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
  const diagnostic = reporter.call(file, `Invalid chart config: ${message}`);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: "@riebeckite/plugin-chartjs",
      ruleId: "invalid-config",
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
