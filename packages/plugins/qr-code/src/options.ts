import type {
  QrCodeLevel,
  QrCodeOptions,
  ResolvedQrCodeOptions,
} from "./types.js";

export const QR_CODE_LEVELS: readonly QrCodeLevel[] = ["L", "M", "Q", "H"];

export const DEFAULT_QR_CODE_OPTIONS: ResolvedQrCodeOptions = {
  level: "M",
  margin: 1,
  width: 160,
  dark: "#000000",
  light: "#ffffff",
  caption: true,
  className: "rb-qr",
  language: "qr",
};

/**
 * Normalises plugin options into a fully-resolved shape. Unknown or invalid
 * values fall back to the documented defaults so the renderer never receives
 * `undefined`; strict rejection is the job of `validateOptions`.
 */
export function resolveQrCodeOptions(
  options: QrCodeOptions = {},
): ResolvedQrCodeOptions {
  const width = normalizePositiveInteger(
    options.width,
    DEFAULT_QR_CODE_OPTIONS.width,
  );
  const margin = normalizeNonNegativeInteger(
    options.margin,
    DEFAULT_QR_CODE_OPTIONS.margin,
  );
  const dark = normalizeColor(options.dark, DEFAULT_QR_CODE_OPTIONS.dark);
  const light = normalizeColor(options.light, DEFAULT_QR_CODE_OPTIONS.light);
  const className = normalizeClassName(options.className);
  const language = normalizeLanguage(options.language);

  return {
    level: normalizeLevel(options.level),
    margin,
    width,
    dark,
    light,
    caption: options.caption ?? DEFAULT_QR_CODE_OPTIONS.caption,
    className,
    language,
  };
}

function normalizeLevel(value: unknown): QrCodeLevel {
  return typeof value === "string" &&
    (QR_CODE_LEVELS as readonly string[]).includes(value)
    ? (value as QrCodeLevel)
    : DEFAULT_QR_CODE_OPTIONS.level;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function normalizeClassName(value: unknown): string {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : DEFAULT_QR_CODE_OPTIONS.className;
}

function normalizeLanguage(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_QR_CODE_OPTIONS.language;
  const language = value.replace(/^language-/, "").trim();
  return language !== "" ? language : DEFAULT_QR_CODE_OPTIONS.language;
}

/** Builds the sub-element class name, e.g. `rb-qr` -> `rb-qr__canvas`. */
export function qrElementClassName(className: string, element: string): string {
  return `${className}__${element}`;
}
