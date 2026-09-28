import type {
  CodeAnnotationsOptions,
  ResolvedCodeAnnotationsOptions,
} from "./types.js";

export const DEFAULT_CODE_ANNOTATIONS_OPTIONS = {
  className: "rb-code",
  lineClassName: "rb-code__line",
  highlightClassName: "rb-code__line--highlighted",
  addedClassName: "rb-code__line--added",
  removedClassName: "rb-code__line--removed",
  focusClassName: "rb-code__line--focused",
} as const;

export function resolveCodeAnnotationsOptions(
  options: CodeAnnotationsOptions = {},
): ResolvedCodeAnnotationsOptions {
  const resolved: ResolvedCodeAnnotationsOptions = {
    className: options.className ?? DEFAULT_CODE_ANNOTATIONS_OPTIONS.className,
    lineClassName:
      options.lineClassName ?? DEFAULT_CODE_ANNOTATIONS_OPTIONS.lineClassName,
    highlightClassName:
      options.highlightClassName ??
      DEFAULT_CODE_ANNOTATIONS_OPTIONS.highlightClassName,
    addedClassName:
      options.addedClassName ?? DEFAULT_CODE_ANNOTATIONS_OPTIONS.addedClassName,
    removedClassName:
      options.removedClassName ??
      DEFAULT_CODE_ANNOTATIONS_OPTIONS.removedClassName,
    focusClassName:
      options.focusClassName ?? DEFAULT_CODE_ANNOTATIONS_OPTIONS.focusClassName,
  };

  const language = options.language?.trim();
  if (language) resolved.language = language;
  return resolved;
}
