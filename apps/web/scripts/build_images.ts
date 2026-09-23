import fs, { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  ATTACHMENTS_BASE_PATH,
  ContentManager,
  IMAGE_EXTENSIONS,
  isAttachmentPath,
  isPublished,
  normalizeContentPath,
} from "@riebeckite/core";
import { config } from "../app/config";
import { ASSETS_ROOT, CONTENT_DIR } from "../app/constants/paths";

const IMAGE_SOURCE_PATTERN = /\b(?:src|href)=["']([^"']+)["']/g;
const ATTACHMENTS_PUBLIC_ROOT = ATTACHMENTS_BASE_PATH.replace(/^\/+/, "");

type ContentImage = {
  sourcePath: string;
  targetPath: string;
  relativePath: string;
};

type ContentAttachment = ContentImage;

type ReferencedAssets = {
  images: Set<string>;
  attachments: Set<string>;
};

async function buildImages() {
  const images = await collectContentImages();
  const attachments = await collectContentAttachments();
  const referencedAssets = await collectReferencedAssets();

  let copied = 0;
  let removed = 0;
  let failed = 0;

  for (const image of images.values()) {
    try {
      if (referencedAssets.images.has(image.relativePath)) {
        await mkdir(path.dirname(image.targetPath), { recursive: true });
        await fs.copyFile(image.sourcePath, image.targetPath);
        copied++;
      } else if (await fileExists(image.targetPath)) {
        await fs.rm(image.targetPath);
        removed++;
      }
    } catch (e) {
      failed++;
      console.error(`Failed to process ${image.relativePath}:`, e);
    }
  }

  for (const attachment of attachments.values()) {
    try {
      if (referencedAssets.attachments.has(attachment.relativePath)) {
        await mkdir(path.dirname(attachment.targetPath), { recursive: true });
        await fs.copyFile(attachment.sourcePath, attachment.targetPath);
        copied++;
      } else if (await fileExists(attachment.targetPath)) {
        await fs.rm(attachment.targetPath);
        removed++;
      }
    } catch (e) {
      failed++;
      console.error(`Failed to process ${attachment.relativePath}:`, e);
    }
  }

  console.log(
    `Processed content assets: ${copied} copied, ${removed} removed, ${failed} failed`,
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function collectContentAttachments(): Promise<
  Map<string, ContentAttachment>
> {
  const entries = await fs.readdir(CONTENT_DIR, {
    withFileTypes: true,
    recursive: true,
  });

  const attachments = new Map<string, ContentAttachment>();

  for (const entry of entries) {
    const sourcePath = path.join(entry.parentPath, entry.name).normalize("NFC");
    const relativePath = normalizeAssetPath(
      path.relative(CONTENT_DIR, sourcePath),
    );
    if (!entry.isFile() || !isAttachmentPath(relativePath)) continue;

    const targetPath = path
      .join(ASSETS_ROOT, ATTACHMENTS_PUBLIC_ROOT, relativePath)
      .normalize("NFC");

    attachments.set(relativePath, { sourcePath, targetPath, relativePath });
  }

  return attachments;
}

async function collectContentImages(): Promise<Map<string, ContentImage>> {
  const entries = await fs.readdir(CONTENT_DIR, {
    withFileTypes: true,
    recursive: true,
  });

  const images = new Map<string, ContentImage>();

  for (const entry of entries) {
    if (entry.isFile() && IMAGE_EXTENSIONS.includes(getExtension(entry.name))) {
      const sourcePath = path
        .join(entry.parentPath, entry.name)
        .normalize("NFC");
      const relativePath = normalizeAssetPath(
        path.relative(CONTENT_DIR, sourcePath),
      );
      const targetPath = path.join(ASSETS_ROOT, relativePath).normalize("NFC");

      images.set(relativePath, { sourcePath, targetPath, relativePath });
    }
  }

  return images;
}

async function collectReferencedAssets(): Promise<ReferencedAssets> {
  const referencedImages = new Set<string>();
  const referencedAttachments = new Set<string>();
  const content = new ContentManager(CONTENT_DIR, config.content.exclude);
  const manifest = await content.getManifest();

  for (const entry of manifest.entries) {
    if (!isPublished(config, entry.frontmatter)) continue;

    for (const link of entry.links) {
      if (!link.slug) continue;
      const normalizedPath = normalizeAssetPath(link.slug);
      if (!isSafeContentPath(normalizedPath)) continue;

      if (link.kind === "image") {
        referencedImages.add(normalizedPath);
      } else if (link.kind === "attachment") {
        referencedAttachments.add(normalizedPath);
      }
    }

    for (const assetPath of extractAssetPaths(entry.slug, entry.html)) {
      referencedImages.add(assetPath);
    }
  }

  return { images: referencedImages, attachments: referencedAttachments };
}

function extractAssetPaths(slug: string, html: string): string[] {
  IMAGE_SOURCE_PATTERN.lastIndex = 0;

  return Array.from(html.matchAll(IMAGE_SOURCE_PATTERN))
    .map((match) => match[1])
    .filter((source): source is string => source !== undefined)
    .map((source) => resolveContentAssetPath(slug, source))
    .filter((assetPath): assetPath is string => assetPath !== null);
}

function resolveContentAssetPath(slug: string, source: string): string | null {
  const withoutQuery = source.split(/[?#]/, 1)[0];
  if (!withoutQuery || /^[a-z][a-z0-9+.-]*:/i.test(withoutQuery)) return null;

  const decodedSource = decodeUrlPath(withoutQuery);
  if (!decodedSource) return null;

  const assetPath = decodedSource.startsWith("/")
    ? decodedSource.slice(1)
    : path.posix.join(path.posix.dirname(slug), decodedSource);
  const normalizedPath = normalizeAssetPath(assetPath);

  if (
    normalizedPath.startsWith("../") ||
    !IMAGE_EXTENSIONS.includes(getExtension(normalizedPath))
  ) {
    return null;
  }

  return normalizedPath;
}

function normalizeAssetPath(assetPath: string): string {
  return normalizeContentPath(assetPath);
}

function isSafeContentPath(assetPath: string): boolean {
  return !assetPath.startsWith("../") && !path.posix.isAbsolute(assetPath);
}

function getExtension(filePath: string): string {
  return path.extname(filePath).replace(".", "").toLowerCase();
}

function decodeUrlPath(urlPath: string): string | null {
  try {
    return decodeURIComponent(urlPath);
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

buildImages().catch((error) => {
  console.error("Failed to build images:", error);
  process.exitCode = 1;
});
