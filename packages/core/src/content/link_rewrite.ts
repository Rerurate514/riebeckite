import type { SourceRange } from "./link_occurrences.js";

export type LinkRewrite = {
  readonly range: SourceRange;
  readonly expected: string;
  readonly replacement: string;
};

export type LinkRewriteResult =
  | { readonly ok: true; readonly content: string; readonly reason?: undefined }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly content?: undefined;
    };

export function rewriteLinkDestinations(
  source: string,
  rewrites: readonly LinkRewrite[],
): LinkRewriteResult {
  const sorted = [...rewrites].toSorted(
    (left, right) => right.range.start - left.range.start,
  );
  let previousStart = source.length;
  let content = source;
  for (const rewrite of sorted) {
    const { start, end } = rewrite.range;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      end < start ||
      end > source.length
    ) {
      return { ok: false, reason: "invalid-range" };
    }
    if (end > previousStart) return { ok: false, reason: "overlapping-ranges" };
    if (source.slice(start, end) !== rewrite.expected) {
      return { ok: false, reason: "source-mismatch" };
    }
    content = `${content.slice(0, start)}${rewrite.replacement}${content.slice(end)}`;
    previousStart = start;
  }
  return { ok: true, content };
}
