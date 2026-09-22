import fs, { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  ContentManager,
  IMAGE_EXTENSIONS,
  isPublished,
} from "@riebeckite/core";
import { config } from "../app/config";
import { ASSETS_ROOT, CONTENT_DIR } from "../app/constants/paths";

const IMAGE_SOURCE_PATTERN = /\b(?:src|href)=["']([^"']+)["']/g;

type ContentImage = {
  sourcePath: string;
  targetPath: string;
  relativePath: string;
};

async function buildImages() {
  const images = await collectContentImages();
  const referencedImages = await collectReferencedImagePaths(images);

  let copied = 0;
  let removed = 0;
  let failed = 0;

  for (const image of images.values()) {
    try {
      if (referencedImages.has(image.relativePath)) {
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

  console.log(
    `Processed images: ${copied} copied, ${removed} removed, ${failed} failed`,
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
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

async function collectReferencedImagePaths(
  images: Map<string, ContentImage>,
): Promise<Set<string>> {
  const referencedImages = new Set<string>();
  const content = new ContentManager(CONTENT_DIR, config.content.exclude);
  const posts = await content.getAllPosts();

  for (const post of posts) {
    const processed = await content.getProcessedContent(post.slug);
    if (!isPublished(config, processed.frontmatter)) continue;

    for (const assetPath of extractAssetPaths(post.slug, processed.html)) {
      if (images.has(assetPath)) {
        referencedImages.add(assetPath);
      }
    }
  }

  return referencedImages;
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
  return assetPath.replace(/\\/g, "/").normalize("NFC");
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
