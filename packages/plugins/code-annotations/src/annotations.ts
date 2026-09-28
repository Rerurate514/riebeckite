import type { CodeAnnotationKind, CodeAnnotationPlan } from "./types.js";

/** Prefix used to smuggle a plan through the preserved fence meta channel. */
export const ANNOTATIONS_META_PREFIX = "rb-annotations=";

const ANNOTATION_KEYS = [
  "highlight",
  "added",
  "removed",
  "focus",
] as const satisfies readonly CodeAnnotationKind[];

const FOCUS_META_PATTERN = /(?:^|\s)focus[:=]\{([^}]*)\}/g;
const HIGHLIGHT_META_PATTERN = /\{([^{}]*)\}/g;

const INLINE_ANNOTATION_PATTERN =
  /([ \t]*)(?:(?:\/\/|#|--)[ \t]*\[!code[ \t]+(focus|highlight|\+\+|--)(?::(\d+))?\]|<!--[ \t]*\[!code[ \t]+(focus|highlight|\+\+|--)(?::(\d+))?[ \t]*-->)[ \t]*$/;

export function createEmptyPlan(): CodeAnnotationPlan {
  return { highlight: [], added: [], removed: [], focus: [] };
}

/**
 * Parse the highlight/focus specifiers of a code fence meta string.
 *
 * Docusaurus-style `{1,3-5}` groups become `highlight` lines. An optional
 * `focus:{1,2}` (or `focus={1,2}`) group becomes `focus` lines. Inline marker
 * comments are not part of the meta string and are handled by
 * {@link collectCodeAnnotations}.
 */
export function parseCodeAnnotations(
  meta: string | null | undefined,
): CodeAnnotationPlan {
  const plan = createEmptyPlan();
  if (typeof meta !== "string" || meta.length === 0) return plan;

  const rest = meta.replace(FOCUS_META_PATTERN, (_match, body: string) => {
    addRanges(plan.focus, parseLineRanges(body));
    return " ";
  });

  for (const match of rest.matchAll(HIGHLIGHT_META_PATTERN)) {
    addRanges(plan.highlight, parseLineRanges(match[1] ?? ""));
  }

  return normalizePlan(plan);
}

/**
 * Parse a numeric range list such as `1,3-5` into sorted 1-based line numbers.
 */
export function parseLineRanges(spec: string): number[] {
  const lines: number[] = [];
  for (const part of spec.split(",")) {
    const trimmed = part.trim();
    if (trimmed === "") continue;

    const range = /^(\d+)\s*-\s*(\d+)$/.exec(trimmed);
    if (range) {
      const first = Number(range[1]);
      const second = Number(range[2]);
      const from = Math.min(first, second);
      const to = Math.max(first, second);
      for (let line = from; line <= to; line += 1) lines.push(line);
      continue;
    }

    if (/^\d+$/.test(trimmed)) lines.push(Number(trimmed));
  }
  return lines;
}

export type InlineCodeAnnotation = {
  kind: CodeAnnotationKind;
  lineCount: number;
};

/**
 * Remove a trailing `[!code ...]` marker comment from a line and report what
 * it annotated. The comment prefix may be `//`, `#`, `--`, or an HTML comment.
 */
export function stripInlineCodeAnnotation(line: string): {
  line: string;
  annotation: InlineCodeAnnotation | null;
} {
  const match = INLINE_ANNOTATION_PATTERN.exec(line);
  if (!match) return { line, annotation: null };

  const kind = normalizeKind(match[2] ?? match[4]);
  if (!kind) return { line, annotation: null };

  const rawCount = match[3] ?? match[5];
  const parsedCount = rawCount === undefined ? 1 : Number(rawCount);
  const lineCount = Number.isFinite(parsedCount) ? Math.max(1, parsedCount) : 1;
  const index = match.index ?? line.length;
  const stripped = line.slice(0, index).replace(/[ \t]+$/, "");
  return { line: stripped, annotation: { kind, lineCount } };
}

export type CollectedCodeAnnotations = {
  plan: CodeAnnotationPlan;
  code: string;
  hasAnnotations: boolean;
};

/**
 * Parse fence meta and inline markers from a code block, returning the
 * annotation plan and the code text with marker comments removed.
 */
export function collectCodeAnnotations(
  meta: string | null | undefined,
  code: string,
): CollectedCodeAnnotations {
  const plan = parseCodeAnnotations(meta);
  const strippedLines: string[] = [];

  code.split("\n").forEach((rawLine, index) => {
    const { line, annotation } = stripInlineCodeAnnotation(rawLine);
    strippedLines.push(line);
    if (!annotation) return;

    const lineNumber = index + 1;
    if (annotation.kind === "focus") {
      for (
        let focused = lineNumber;
        focused < lineNumber + annotation.lineCount;
        focused += 1
      ) {
        plan.focus.push(focused);
      }
      return;
    }
    plan[annotation.kind].push(lineNumber);
  });

  const hasAnnotations = ANNOTATION_KEYS.some((key) => plan[key].length > 0);
  return {
    plan: hasAnnotations ? normalizePlan(plan) : createEmptyPlan(),
    code: strippedLines.join("\n"),
    hasAnnotations,
  };
}

export function normalizePlan(plan: CodeAnnotationPlan): CodeAnnotationPlan {
  return {
    highlight: normalizeLines(plan.highlight),
    added: normalizeLines(plan.added),
    removed: normalizeLines(plan.removed),
    focus: normalizeLines(plan.focus),
  };
}

export function hasAnnotations(plan: CodeAnnotationPlan | null): boolean {
  if (!plan) return false;
  return ANNOTATION_KEYS.some((key) => plan[key].length > 0);
}

export function serializeAnnotations(plan: CodeAnnotationPlan): string {
  return JSON.stringify(normalizePlan(plan));
}

export function deserializeAnnotations(
  value: unknown,
): CodeAnnotationPlan | null {
  if (typeof value !== "string" || value === "") return null;
  try {
    return coercePlan(JSON.parse(value));
  } catch {
    return null;
  }
}

export function encodeAnnotationsMeta(plan: CodeAnnotationPlan): string {
  return `${ANNOTATIONS_META_PREFIX}${encodeURIComponent(
    serializeAnnotations(plan),
  )}`;
}

export function appendAnnotationsMeta(
  meta: string | null | undefined,
  plan: CodeAnnotationPlan,
): string {
  const token = encodeAnnotationsMeta(plan);
  const base = typeof meta === "string" ? meta.trim() : "";
  return base === "" ? token : `${base} ${token}`;
}

export function extractAnnotationsMeta(
  meta: string | null | undefined,
): CodeAnnotationPlan | null {
  if (typeof meta !== "string") return null;
  const match = meta.match(/(?:^|\s)rb-annotations=([^\s]+)/);
  if (!match) return null;
  try {
    return coercePlan(JSON.parse(decodeURIComponent(match[1])));
  } catch {
    return null;
  }
}

/** Remove an embedded plan token, keeping any surrounding fence meta. */
export function removeAnnotationsMeta(meta: string | null | undefined): string {
  if (typeof meta !== "string") return "";
  return meta
    .replace(/(?:^|\s)rb-annotations=[^\s]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function coercePlan(value: unknown): CodeAnnotationPlan | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    highlight: coerceLines(record.highlight),
    added: coerceLines(record.added),
    removed: coerceLines(record.removed),
    focus: coerceLines(record.focus),
  };
}

function coerceLines(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is number =>
      typeof entry === "number" && Number.isFinite(entry) && entry > 0,
  );
}

function addRanges(target: number[], ranges: number[]): void {
  target.push(...ranges);
}

function normalizeLines(lines: number[]): number[] {
  return [...new Set(lines.filter((line) => line > 0))].sort(
    (left, right) => left - right,
  );
}

function normalizeKind(kind: string | undefined): CodeAnnotationKind | null {
  if (kind === "++") return "added";
  if (kind === "--") return "removed";
  if (kind === "focus") return "focus";
  if (kind === "highlight") return "highlight";
  return null;
}
