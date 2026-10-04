import type { ArchiveOptions, ResolvedArchiveOptions } from "./types.js";

export const DEFAULT_ARCHIVE_BASE_PATH = "/archive";
export const DEFAULT_ARCHIVE_PAGE_SIZE = 10;
export const DEFAULT_ARCHIVE_CLASS_NAME = "rb-archive";

export function resolveArchiveOptions(
  options: ArchiveOptions = {},
): ResolvedArchiveOptions {
  return {
    basePath: normalizeBasePath(options.basePath ?? DEFAULT_ARCHIVE_BASE_PATH),
    pageSize: normalizePageSize(options.pageSize ?? DEFAULT_ARCHIVE_PAGE_SIZE),
    locale: options.locale?.trim() ? options.locale.trim() : null,
    className: options.className?.trim() || DEFAULT_ARCHIVE_CLASS_NAME,
  };
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed.length === 0) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizePageSize(value: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}
