import type { ContentSource } from "@riebeckite/core";
import { IMAGE_EXTENSIONS, readContentSourceEntry } from "@riebeckite/core";
import type { ExcalidrawScene, ObsidianEmbeddedFile } from "./src/types.js";

export async function mergeEmbeddedFiles(input: {
  scene: ExcalidrawScene;
  embeddedFiles: readonly ObsidianEmbeddedFile[];
  contentSource: ContentSource;
  contentIndex: Map<string, string>;
}): Promise<ExcalidrawScene> {
  const resolvedFiles = await resolveEmbeddedFiles(input);
  return {
    ...input.scene,
    files: {
      ...(input.scene.files ?? {}),
      ...resolvedFiles,
    },
  };
}

export async function resolveEmbeddedFiles(input: {
  embeddedFiles: readonly ObsidianEmbeddedFile[];
  contentSource: ContentSource;
  contentIndex: Map<string, string>;
}): Promise<Record<string, Record<string, unknown>>> {
  const files: Record<string, Record<string, unknown>> = {};

  for (const embeddedFile of input.embeddedFiles) {
    const assetPath = input.contentIndex.get(embeddedFile.target.toLowerCase());
    if (!assetPath || !isSupportedImagePath(assetPath)) continue;

    try {
      const data = await readContentSourceEntry(input.contentSource, assetPath);
      if (data === null) continue;
      const mimeType = getImageMimeType(assetPath);
      files[embeddedFile.fileId] = {
        id: embeddedFile.fileId,
        dataURL: `data:${mimeType};base64,${toBase64(data)}`,
        mimeType,
        created: 0,
        lastRetrieved: 0,
      };
    } catch (error) {
      console.error("[plugin-excalidraw] Failed to resolve embedded file", {
        target: embeddedFile.target,
        error,
      });
    }
  }

  return files;
}

export function isSupportedImagePath(filePath: string): boolean {
  const extension = getPathExtension(filePath);
  return IMAGE_EXTENSIONS.includes(extension);
}

export function getImageMimeType(filePath: string): string {
  const extension = getPathExtension(filePath);
  if (extension === "jpg") return "image/jpeg";
  if (extension === "svg") return "image/svg+xml";
  return `image/${extension}`;
}

export function getPathExtension(filePath: string): string {
  const fileName = getFileName(filePath.toLowerCase());
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart > 0 ? fileName.slice(extensionStart + 1) : "";
}

export async function readText(
  source: ContentSource,
  logicalPath: string,
): Promise<string | null> {
  const content = await readContentSourceEntry(source, logicalPath);
  if (content === null) return null;
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

export function toBase64(content: string | Uint8Array): string {
  const bytes =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  return Buffer.from(bytes).toString("base64");
}

export function getFileName(contentPath: string): string {
  return contentPath.split("/").at(-1) ?? contentPath;
}
