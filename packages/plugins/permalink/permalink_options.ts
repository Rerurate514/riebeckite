import type { PostFrontmatter } from "@riebeckite/core";
import type { PermalinkOptions, ResolvedOptions } from "./permalink_types.js";

export function resolveOptions(options: PermalinkOptions): ResolvedOptions {
  const frontmatter = options.frontmatter ?? "id";
  const strategy = options.id?.strategy ?? "frontmatter-or-hash";
  const hashLength = options.id?.length ?? 12;
  if (!Number.isInteger(hashLength) || hashLength < 6 || hashLength > 43) {
    throw new Error(
      "Permalink hash ID length must be an integer from 6 through 43.",
    );
  }
  const mode = options.path?.mode ?? "flat";
  if (!(["flat", "preserve", "append"] as const).includes(mode)) {
    throw new Error(`Invalid permalink path mode: ${mode}`);
  }
  const redirectStatus = options.redirects?.status ?? 308;
  if (!([301, 302, 307, 308] as const).includes(redirectStatus)) {
    throw new Error(`Invalid permalink redirect status: ${redirectStatus}`);
  }
  return {
    frontmatter: validateFieldName(frontmatter, "ID"),
    strategy,
    hashLength,
    mode,
    prefix: normalizePrefix(options.path?.prefix ?? "/n"),
    trailingSlash: options.path?.trailingSlash ?? false,
    collapseIndex: options.index?.collapse ?? true,
    overrideField: validateFieldName(
      options.override?.frontmatter ?? "permalink",
      "override",
    ),
    redirectsField: validateFieldName(
      options.redirects?.frontmatter ?? "redirect_from",
      "redirect",
    ),
    redirectStatus,
  };
}

export function readOptionalString(
  frontmatter: PostFrontmatter,
  field: string,
): string | null {
  const value = frontmatter[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string")
    throw new Error(`Permalink frontmatter field "${field}" must be a string.`);
  return value.trim() || null;
}

export function readRedirects(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
    return value;
  throw new Error(
    `Permalink redirect field must be a string or string array: ${path}`,
  );
}

export function validateId(value: string, path: string): string {
  const id = value.trim();
  const decoded = hasMalformedPercentEncoding(id)
    ? null
    : decodeURIComponent(id);
  if (
    !id ||
    !decoded ||
    decoded === "." ||
    decoded === ".." ||
    /[\\/#?]/.test(decoded) ||
    /\s/.test(decoded)
  ) {
    throw new Error(
      `Invalid permalink ID "${value}" in ${path}. IDs must be a non-empty single path segment.`,
    );
  }
  return id;
}

export function normalizePrefix(value: string): string {
  if (!value.trim() || value.trim() === "/") return "";
  return normalizePath(value, false);
}

export function normalizePath(value: string, trailingSlash: boolean): string {
  const raw = value.trim();
  if (
    raw.length === 0 ||
    !raw.startsWith("/") ||
    raw.includes("?") ||
    raw.includes("#") ||
    raw.includes("\\") ||
    raw.includes("//")
  ) {
    throw new Error(
      `Invalid permalink path: "${value}". It must be a site-local absolute path.`,
    );
  }
  const segments = raw
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (
        segment === "." ||
        segment === ".." ||
        hasMalformedPercentEncoding(segment)
      ) {
        throw new Error(`Invalid permalink path: "${value}".`);
      }
      return encodeURIComponent(decodeURIComponent(segment));
    });
  const path = `/${segments.join("/")}`;
  if (path === "/") return "/";
  return trailingSlash ? `${path}/` : path;
}

export function joinPath(prefix: string, ...segments: string[]): string {
  return [
    prefix,
    ...segments.map((segment) =>
      encodeURIComponent(decodeURIComponent(segment)),
    ),
  ]
    .filter(Boolean)
    .join("/")
    .replace(/^([^/])/, "/$1");
}

export function hasMalformedPercentEncoding(value: string): boolean {
  try {
    decodeURIComponent(value);
    return false;
  } catch {
    return true;
  }
}

export function validateFieldName(value: string, label: string): string {
  if (!value.trim() || /[.[\]]/.test(value))
    throw new Error(`Permalink ${label} frontmatter field must be top-level.`);
  return value;
}
