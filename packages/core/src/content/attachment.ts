import { IMAGE_EXTENSIONS } from "./image_extensions.js";

export const ATTACHMENTS_BASE_PATH = "/assets/attachments";

export function isMarkdownPath(filePath: string): boolean {
  return getExtension(filePath) === "md";
}

export function isImagePath(filePath: string): boolean {
  return IMAGE_EXTENSIONS.includes(getExtension(filePath));
}

export function isAttachmentPath(filePath: string): boolean {
  return (
    hasFileExtension(filePath) &&
    !isMarkdownPath(filePath) &&
    !isImagePath(filePath)
  );
}

export function getExtension(filePath: string): string {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith(".tar.gz")) return "tar.gz";
  const fileName = getFileName(filePath);
  const extensionStart = fileName.lastIndexOf(".");
  if (extensionStart <= 0) return "";
  return fileName.slice(extensionStart + 1).toLowerCase();
}

export function attachmentUrl(filePath: string): string {
  const encodedPath = normalizeContentPath(filePath)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${ATTACHMENTS_BASE_PATH}/${encodedPath}`;
}

export function normalizeContentPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").normalize("NFC");
}

/**
 * Parameters read from an Obsidian embed fragment such as
 * `#page=3&height=400` or `#t=10`.
 *
 * Only values that Obsidian defines are accepted, so an unknown fragment is
 * ignored rather than forwarded into a viewer URL or media element.
 */
export type EmbedFragmentParameters = {
  readonly page?: number;
  readonly height?: number;
  readonly startTime?: number;
  readonly endTime?: number;
};

export function parseEmbedFragmentParameters(
  fragment: string | undefined,
): EmbedFragmentParameters {
  const value = fragment?.trim();
  if (!value) return {};

  const parameters = new Map<string, string>();
  for (const part of value.split("&")) {
    const separator = part.indexOf("=");
    const key = (separator < 0 ? part : part.slice(0, separator))
      .trim()
      .toLowerCase();
    if (key)
      parameters.set(
        key,
        separator < 0 ? "" : part.slice(separator + 1).trim(),
      );
  }

  const page = positiveInteger(parameters.get("page"));
  const height = positiveInteger(parameters.get("height"));
  const time = parseTime(parameters.get("t") ?? parameters.get("start"));
  return {
    ...(page === undefined ? {} : { page }),
    ...(height === undefined ? {} : { height }),
    ...(time ?? {}),
  };
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function parseTime(
  value: string | undefined,
): { startTime?: number; endTime?: number } | undefined {
  if (!value) return undefined;
  const [start, end] = value.split(",", 2);
  const startTime = seconds(start);
  if (startTime === undefined) return undefined;
  const endTime = seconds(end);
  return endTime === undefined ? { startTime } : { startTime, endTime };
}

function seconds(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parts = value.split(":");
  if (parts.length > 3) return undefined;
  let total = 0;
  for (const part of parts) {
    if (!/^\d+(?:\.\d+)?$/.test(part)) return undefined;
    const number = Number(part);
    if (!Number.isFinite(number)) return undefined;
    total = total * 60 + number;
  }
  return total;
}

function hasFileExtension(filePath: string): boolean {
  const fileName = getFileName(filePath);
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart > 0 && extensionStart < fileName.length - 1;
}

function getFileName(filePath: string): string {
  const normalizedPath = normalizeContentPath(filePath);
  return normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
}
