import { IMAGE_EXTENSIONS } from "./image_extensions";

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

function hasFileExtension(filePath: string): boolean {
  const fileName = getFileName(filePath);
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart > 0 && extensionStart < fileName.length - 1;
}

function getFileName(filePath: string): string {
  const normalizedPath = normalizeContentPath(filePath);
  return normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
}
