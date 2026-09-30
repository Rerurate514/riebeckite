import type { ConfigValidationIssue } from "@riebeckite/core";

export const DEFAULT_RESPONSIVE_IMAGE_CLASS = "rb-responsive-image";
export const DEFAULT_RESPONSIVE_IMAGE_SIZES = "100vw";
export const DEFAULT_RESPONSIVE_IMAGE_WIDTHS = [640, 1280, 1920];
export const DEFAULT_RESPONSIVE_IMAGE_FORMATS = ["webp", "avif"];

export type ResponsiveImageOptions = {
  /**
   * Add `loading="lazy"` to processed images when the attribute is absent.
   * Defaults to `true`.
   */
  lazy?: boolean;
  /**
   * Add `decoding="async"` to processed images when the attribute is absent.
   * Defaults to `true`.
   */
  decoding?: boolean;
  /**
   * Fallback `sizes` value added when the attribute is absent.
   * Defaults to `"100vw"`.
   */
  sizes?: string;
  /**
   * Candidate widths used to look up pre-generated width variants.
   * Defaults to `[640, 1280, 1920]`.
   */
  widths?: readonly number[];
  /**
   * Candidate formats used to look up pre-generated format variants.
   * Defaults to `["webp", "avif"]`.
   */
  formats?: readonly string[];
  /**
   * Class name applied to the generated `<picture>` element.
   * Defaults to `"rb-responsive-image"`.
   */
  className?: string;
  /**
   * Reserved. Binary encoding is not implemented because Core has no
   * file-emission API for plugins. Prepared for a future release.
   */
  generate?: boolean;
  /**
   * Reserved. Only meaningful together with `generate`.
   */
  outputDir?: string;
};

export type ResolvedResponsiveImageOptions = {
  lazy: boolean;
  decoding: boolean;
  sizes: string;
  widths: readonly number[];
  formats: readonly string[];
  className: string;
  generate: boolean;
  outputDir: string | null;
};

export function resolveResponsiveImageOptions(
  options: ResponsiveImageOptions = {},
): ResolvedResponsiveImageOptions {
  return {
    lazy: options.lazy ?? true,
    decoding: options.decoding ?? true,
    sizes: normalizeSizes(options.sizes),
    widths: normalizeWidths(options.widths),
    formats: normalizeFormats(options.formats),
    className: normalizeClassName(options.className),
    generate: options.generate ?? false,
    outputDir: options.outputDir ?? null,
  };
}

export function validateResponsiveImageOptions(
  options: ResponsiveImageOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  for (const key of ["lazy", "decoding", "generate"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }

  if (
    options.sizes !== undefined &&
    (typeof options.sizes !== "string" || options.sizes.trim() === "")
  ) {
    issues.push({ path: "sizes", message: "Expected a non-empty string." });
  }

  if (
    options.className !== undefined &&
    (typeof options.className !== "string" || options.className.trim() === "")
  ) {
    issues.push({ path: "className", message: "Expected a non-empty string." });
  }

  if (options.widths !== undefined && !isWidthList(options.widths)) {
    issues.push({
      path: "widths",
      message: "Expected an array of positive integers.",
    });
  }

  if (options.formats !== undefined && !isFormatList(options.formats)) {
    issues.push({
      path: "formats",
      message: "Expected an array of non-empty strings.",
    });
  }

  if (
    options.outputDir !== undefined &&
    (typeof options.outputDir !== "string" || options.outputDir.trim() === "")
  ) {
    issues.push({ path: "outputDir", message: "Expected a non-empty string." });
  }

  return issues;
}

function normalizeSizes(value: string | undefined): string {
  const sizes = value?.trim();
  return sizes ? sizes : DEFAULT_RESPONSIVE_IMAGE_SIZES;
}

function normalizeClassName(value: string | undefined): string {
  const className = value?.trim();
  return className ? className : DEFAULT_RESPONSIVE_IMAGE_CLASS;
}

function normalizeWidths(
  value: readonly number[] | undefined,
): readonly number[] {
  if (!value) return [...DEFAULT_RESPONSIVE_IMAGE_WIDTHS];

  const widths = Array.from(
    new Set(
      value.filter(
        (width): width is number => Number.isInteger(width) && width > 0,
      ),
    ),
  ).toSorted((a, b) => a - b);

  return widths.length > 0 ? widths : [...DEFAULT_RESPONSIVE_IMAGE_WIDTHS];
}

function normalizeFormats(
  value: readonly string[] | undefined,
): readonly string[] {
  if (!value) return [...DEFAULT_RESPONSIVE_IMAGE_FORMATS];

  const formats: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const format = candidate.trim().toLowerCase().replace(/^\.+/, "");
    if (!/^[a-z0-9]+$/.test(format)) continue;
    if (!formats.includes(format)) formats.push(format);
  }

  return formats.length > 0 ? formats : [...DEFAULT_RESPONSIVE_IMAGE_FORMATS];
}

function isWidthList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((item) => Number.isInteger(item) && item > 0)
  );
}

function isFormatList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim() !== "")
  );
}
