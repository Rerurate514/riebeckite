import type { Diagnostic, DiagnosticSeverity } from "@riebeckite/core";
import { resolveInspectOptions } from "./options.js";
import {
  attribute,
  type HtmlElement,
  hasNonEmptyAttribute,
  maskIgnoredRegions,
  scanElements,
  textContent,
} from "./scanner.js";
import type { InspectOptions, ResolvedInspectOptions } from "./types.js";

export const QUALITY_PLUGIN_NAME = "quality";

/**
 * Stable diagnostic codes emitted by this package. Codes are part of the
 * public contract and must not change without a major version bump.
 */
export const RULE_CODES = {
  imgAltMissing: "quality:img-alt-missing",
  duplicateId: "quality:duplicate-id",
  brokenInternalAnchor: "quality:broken-internal-anchor",
  headingOrder: "quality:heading-order",
  emptyLinkText: "quality:empty-link-text",
  htmlLangMissing: "quality:html-lang-missing",
  tableNoHeader: "quality:table-no-header",
} as const;

export type RuleCode = (typeof RULE_CODES)[keyof typeof RULE_CODES];

type InspectionContext = {
  html: string;
  elements: readonly HtmlElement[];
};

type Rule = (context: InspectionContext) => Diagnostic[];

/**
 * Runs every rule against an HTML document. This is the internal entry point;
 * prefer {@link inspectHtml} for the public API.
 */
export function runInspection(
  html: string,
  options: ResolvedInspectOptions,
): Diagnostic[] {
  if (!options.enabled) return [];
  const masked = maskIgnoredRegions(html);
  const context: InspectionContext = {
    html: masked,
    elements: scanElements(masked),
  };
  return RULES.flatMap((rule) => rule(context)).filter(
    (diagnostic) => !options.ignoreRules.has(diagnostic.code),
  );
}

/**
 * Inspects an HTML string and returns the quality diagnostics it violates.
 * Purely functional: the input is never mutated and no filesystem is touched.
 */
export function inspectHtml(
  html: string,
  options: InspectOptions = {},
): Diagnostic[] {
  return runInspection(html, resolveInspectOptions(options));
}

const RULES: readonly Rule[] = [
  imgAltMissing,
  duplicateId,
  brokenInternalAnchor,
  headingOrder,
  emptyLinkText,
  htmlLangMissing,
  tableNoHeader,
];

function imgAltMissing({ elements }: InspectionContext): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const element of elements) {
    if (element.tag !== "img") continue;
    if (element.attributes.has("alt")) continue;
    diagnostics.push(
      createDiagnostic(
        RULE_CODES.imgAltMissing,
        "warning",
        "<img> is missing an alt attribute.",
        {
          target: "img",
          suggestion:
            'Add alt="..." describing the image, or alt="" for decorative images.',
        },
      ),
    );
  }
  return diagnostics;
}

function duplicateId({ elements }: InspectionContext): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const counts = new Map<string, number>();
  for (const element of elements) {
    const id = attribute(element, "id");
    if (id === undefined || id.trim() === "") continue;
    const count = (counts.get(id) ?? 0) + 1;
    counts.set(id, count);
    if (count > 1) {
      diagnostics.push(
        createDiagnostic(
          RULE_CODES.duplicateId,
          "error",
          `Duplicate id "${id}" is used ${count} times in the same document.`,
          { target: id, suggestion: "Make each id unique within the page." },
        ),
      );
    }
  }
  return diagnostics;
}

function brokenInternalAnchor({ elements }: InspectionContext): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  for (const element of elements) {
    const id = attribute(element, "id");
    if (id !== undefined && id.trim() !== "") ids.add(id);
  }
  for (const element of elements) {
    if (element.tag !== "a") continue;
    const href = attribute(element, "href");
    if (href === undefined || !href.startsWith("#")) continue;
    const target = href.slice(1);
    if (target === "" || ids.has(target)) continue;
    diagnostics.push(
      createDiagnostic(
        RULE_CODES.brokenInternalAnchor,
        "warning",
        `Link target "#${target}" has no matching id in the same document.`,
        {
          target: href,
          suggestion: `Add an element with id="${target}" or fix the link.`,
        },
      ),
    );
  }
  return diagnostics;
}

function headingOrder({ elements }: InspectionContext): Diagnostic[] {
  const graphics = graphicRanges(elements);
  const levels: number[] = [];
  for (const element of elements) {
    if (isInsideGraphic(element, graphics)) continue;
    const level = headingLevel(element.tag);
    if (level !== null) levels.push(level);
  }
  if (levels.length === 0) return [];

  const diagnostics: Diagnostic[] = [];
  if (!levels.includes(1)) {
    diagnostics.push(
      createDiagnostic(
        RULE_CODES.headingOrder,
        "warning",
        "Document has headings but no <h1>.",
        {
          target: "h1",
          suggestion: "Start the heading outline with a level-1 heading.",
        },
      ),
    );
  }
  let previous = levels[0] ?? 1;
  for (let index = 1; index < levels.length; index++) {
    const current = levels[index] ?? previous;
    if (current > previous + 1) {
      diagnostics.push(
        createDiagnostic(
          RULE_CODES.headingOrder,
          "warning",
          `Heading level skips from h${previous} to h${current}.`,
          {
            target: `h${current}`,
            suggestion:
              "Use consecutive heading levels to keep the outline valid.",
          },
        ),
      );
    }
    previous = current;
  }
  return diagnostics;
}

function emptyLinkText({ elements }: InspectionContext): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const element of elements) {
    if (element.tag !== "a") continue;
    if (!element.attributes.has("href")) continue;
    if (hasAccessibleName(element)) continue;
    if (textContent(element.content).trim() !== "") continue;
    diagnostics.push(
      createDiagnostic(
        RULE_CODES.emptyLinkText,
        "warning",
        "<a> has empty text and no accessible name.",
        {
          target: attribute(element, "href") ?? "a",
          suggestion:
            "Add link text, an aria-label/title, or an image with a non-empty alt.",
        },
      ),
    );
  }
  return diagnostics;
}

function htmlLangMissing({ elements }: InspectionContext): Diagnostic[] {
  const html = elements.find((element) => element.tag === "html");
  if (!html) return [];
  const lang = attribute(html, "lang");
  if (lang !== undefined && lang.trim() !== "") return [];
  return [
    createDiagnostic(
      RULE_CODES.htmlLangMissing,
      "warning",
      "The <html> element is missing a non-empty lang attribute.",
      {
        target: "html",
        suggestion: 'Set lang="..." (for example lang="en") on <html>.',
      },
    ),
  ];
}

function tableNoHeader({ elements }: InspectionContext): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const element of elements) {
    if (element.tag !== "table") continue;
    const cells = scanElements(element.content).filter(
      (candidate) => candidate.tag === "td" || candidate.tag === "th",
    );
    if (cells.length === 0) continue;
    const hasHeaderCell = cells.some((cell) => cell.tag === "th");
    const hasScope = cells.some(
      (cell) => cell.attributes.has("scope") || cell.attributes.has("headers"),
    );
    if (hasHeaderCell || hasScope) continue;
    diagnostics.push(
      createDiagnostic(
        RULE_CODES.tableNoHeader,
        "warning",
        "<table> has data cells but no header cell.",
        {
          target: "table",
          suggestion:
            "Add a <th> header, or annotate cells with scope/headers.",
        },
      ),
    );
  }
  return diagnostics;
}

function hasAccessibleName(element: HtmlElement): boolean {
  if (hasNonEmptyAttribute(element, "aria-label")) return true;
  if (hasNonEmptyAttribute(element, "title")) return true;
  return scanElements(element.content).some(
    (candidate) =>
      candidate.tag === "img" && hasNonEmptyAttribute(candidate, "alt"),
  );
}

function headingLevel(tag: string): number | null {
  if (tag.length !== 2 || tag[0] !== "h") return null;
  const level = Number.parseInt(tag[1] ?? "", 10);
  return level >= 1 && level <= 6 ? level : null;
}

/**
 * Ranges of `<svg>` and `<foreignObject>` elements. Diagram embeds such as
 * Marp render their slides as `<svg><foreignObject><section>…`, which puts
 * real `<h1>` tags inside graphic markup; those headings belong to the
 * drawing, not to the document outline.
 */
function graphicRanges(
  elements: readonly HtmlElement[],
): Array<readonly [number, number]> {
  const ranges: Array<readonly [number, number]> = [];
  for (const element of elements) {
    if (element.tag !== "svg" && element.tag !== "foreignobject") continue;
    ranges.push([element.start, element.end + element.content.length]);
  }
  return ranges;
}

function isInsideGraphic(
  element: HtmlElement,
  ranges: readonly (readonly [number, number])[],
): boolean {
  return ranges.some(
    ([start, end]) => element.start >= start && element.start < end,
  );
}

function createDiagnostic(
  code: RuleCode,
  severity: DiagnosticSeverity,
  message: string,
  extra: { target?: string; suggestion?: string } = {},
): Diagnostic {
  return {
    code,
    severity,
    message,
    pluginName: QUALITY_PLUGIN_NAME,
    ...extra,
  };
}
