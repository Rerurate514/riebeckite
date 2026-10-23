import {
  buildDiagramFigure,
  deterministicDiagramId,
  findDiagramBlocks,
  reportDiagramDiagnostic,
  resolveDiagramCaption,
} from "@riebeckite/diagram";
import type {
  ChartJsOptions,
  ElementNode,
  HastNode,
  ParentNode,
} from "./types.js";

const DEFAULT_CLASS_NAME = "rb-chartjs";
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
    for (const block of findDiagramBlocks(tree, { languages: ["chart"] })) {
      replaceChartBlock(
        block.parent as ParentNode,
        block.index,
        block.pre as ElementNode,
        block.code as ElementNode,
        block.source,
        file,
        {
          className,
          responsive,
          caption,
        },
      );
    }
  };
}

function replaceChartBlock(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  code: ElementNode,
  source: string,
  file: unknown,
  options: { className: string; responsive: boolean; caption: boolean },
) {
  const parsed = parseChartConfig(source);
  if (isParseFailure(parsed)) {
    reportDiagramDiagnostic(file, {
      source: "@riebeckite/plugin-chartjs",
      ruleId: "invalid-config",
      message: `Invalid chart config: ${parsed.message}`,
    });
    return;
  }

  applyResponsiveDefault(parsed.config, options.responsive);
  const captionText = options.caption
    ? (resolveDiagramCaption(
        { pre, code, parent, index, source, language: "chart" },
        [() => parsed.caption],
      ) ?? null)
    : null;
  const label = captionText ?? `Chart: ${String(parsed.config.type)}`;

  parent.children = parent.children ?? [];
  parent.children[index] = buildDiagramFigure({
    className: options.className,
    id: deterministicDiagramId("chartjs", source),
    kind: "chartjs",
    source,
    caption: captionText,
    label,
    status: "pending",
    fallback: true,
    content: {
      kind: "canvas",
      attrs: { dataDiagramConfig: JSON.stringify(parsed.config) },
    },
    attributes: { dataChartjsMarker: FIGURE_MARKER },
  });
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
    typeof caption === "string" && caption.trim() !== ""
      ? caption.trim()
      : null;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
