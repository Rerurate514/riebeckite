import fs, { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTACHMENTS_BASE_PATH,
  ContentManager,
  IMAGE_EXTENSIONS,
  isAttachmentPath,
  normalizeContentPath,
  resolveConfigModule,
} from "@riebeckite/core";
import { resolveHonoxConfig } from "@riebeckite/honox/runtime";
import * as rawConfigModule from "../../../riebeckite.config";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const config = resolveHonoxConfig(
  resolveConfigModule(rawConfigModule),
  appRoot,
);
const CONTENT_DIR = config.content.directory;
const ASSETS_ROOT = "public/";

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

type CopyResult = "copied" | "skipped";

export type BuildImagesOptions = {
  contentDir?: string;
  assetsRoot?: string;
  exclude?: readonly string[];
};

export async function buildImages(options: BuildImagesOptions = {}) {
  const contentDir = options.contentDir ?? CONTENT_DIR;
  const assetsRoot = options.assetsRoot ?? ASSETS_ROOT;
  const exclude = options.exclude ?? config.content.exclude;
  const images = await collectContentImages(contentDir, assetsRoot);
  const attachments = await collectContentAttachments(contentDir, assetsRoot);
  const referencedAssets = await collectReferencedAssets(contentDir, exclude);

  let copied = 0;
  let skipped = 0;
  let removed = 0;
  let failed = 0;

  for (const image of images.values()) {
    try {
      if (referencedAssets.images.has(image.relativePath)) {
        const result = await copyIfChanged(image.sourcePath, image.targetPath);
        if (result === "copied") copied++;
        else skipped++;
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
        const result = await copyIfChanged(
          attachment.sourcePath,
          attachment.targetPath,
        );
        if (result === "copied") copied++;
        else skipped++;
      } else if (await fileExists(attachment.targetPath)) {
        await fs.rm(attachment.targetPath);
        removed++;
      }
    } catch (e) {
      failed++;
      console.error(`Failed to process ${attachment.relativePath}:`, e);
    }
  }

  const orphanedImages = await removeOrphanedImages(images, assetsRoot);
  removed += orphanedImages.removed;
  failed += orphanedImages.failed;

  const orphaned = await removeOrphanedAttachments(attachments, assetsRoot);
  removed += orphaned.removed;
  failed += orphaned.failed;

  console.log(
    `Processed content assets: ${copied} copied, ${skipped} skipped, ${removed} removed, ${failed} failed`,
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function copyIfChanged(
  sourcePath: string,
  targetPath: string,
): Promise<CopyResult> {
  const sourceStats = await fs.stat(sourcePath);
  const targetStats = await getFileStats(targetPath);

  if (
    targetStats !== null &&
    sourceStats.size === targetStats.size &&
    sourceStats.mtimeMs === targetStats.mtimeMs
  ) {
    return "skipped";
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  await fs.utimes(targetPath, sourceStats.atime, sourceStats.mtime);
  return "copied";
}

async function collectContentAttachments(
  contentDir: string,
  assetsRoot: string,
): Promise<Map<string, ContentAttachment>> {
  const entries = await fs.readdir(contentDir, {
    withFileTypes: true,
    recursive: true,
  });

  const attachments = new Map<string, ContentAttachment>();

  for (const entry of entries) {
    const sourcePath = path.join(entry.parentPath, entry.name).normalize("NFC");
    const relativePath = normalizeAssetPath(
      path.relative(contentDir, sourcePath),
    );
    if (!entry.isFile() || !isAttachmentPath(relativePath)) continue;

    const targetPath = path
      .join(assetsRoot, ATTACHMENTS_PUBLIC_ROOT, relativePath)
      .normalize("NFC");

    attachments.set(relativePath, { sourcePath, targetPath, relativePath });
  }

  return attachments;
}

async function removeOrphanedAttachments(
  attachments: Map<string, ContentAttachment>,
  assetsRoot: string,
): Promise<{ removed: number; failed: number }> {
  const publicRoot = path.join(assetsRoot, ATTACHMENTS_PUBLIC_ROOT);
  let removed = 0;
  let failed = 0;

  if (!(await fileExists(publicRoot))) {
    return { removed, failed };
  }

  const entries = await fs.readdir(publicRoot, {
    withFileTypes: true,
    recursive: true,
  });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const sourcePath = path.join(entry.parentPath, entry.name).normalize("NFC");
    const relativePath = normalizeAssetPath(
      path.relative(publicRoot, sourcePath),
    );
    if (attachments.has(relativePath)) continue;

    try {
      await fs.rm(sourcePath);
      removed++;
    } catch (e) {
      failed++;
      console.error(`Failed to remove orphaned attachment ${relativePath}:`, e);
    }
  }

  return { removed, failed };
}

async function collectContentImages(
  contentDir: string,
  assetsRoot: string,
): Promise<Map<string, ContentImage>> {
  const entries = await fs.readdir(contentDir, {
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
        path.relative(contentDir, sourcePath),
      );
      const targetPath = path.join(assetsRoot, relativePath).normalize("NFC");

      images.set(relativePath, { sourcePath, targetPath, relativePath });
    }
  }

  return images;
}

async function removeOrphanedImages(
  images: Map<string, ContentImage>,
  assetsRoot: string,
): Promise<{ removed: number; failed: number }> {
  let removed = 0;
  let failed = 0;

  if (!(await fileExists(assetsRoot))) {
    return { removed, failed };
  }

  const entries = await fs.readdir(assetsRoot, {
    withFileTypes: true,
    recursive: true,
  });

  for (const entry of entries) {
    if (
      !entry.isFile() ||
      !IMAGE_EXTENSIONS.includes(getExtension(entry.name))
    ) {
      continue;
    }
    const sourcePath = path.join(entry.parentPath, entry.name).normalize("NFC");
    const relativePath = normalizeAssetPath(
      path.relative(assetsRoot, sourcePath),
    );
    if (images.has(relativePath) || isReservedPublicImage(relativePath))
      continue;

    try {
      await fs.rm(sourcePath);
      removed++;
    } catch (e) {
      failed++;
      console.error(`Failed to remove orphaned image ${relativePath}:`, e);
    }
  }

  return { removed, failed };
}

async function collectReferencedAssets(
  contentDir: string,
  exclude: readonly string[],
): Promise<ReferencedAssets> {
  const referencedImages = new Set<string>();
  const referencedAttachments = new Set<string>();
  const content = new ContentManager(contentDir, [...exclude]);
  const manifest = await content.build();

  for (const entry of manifest.publicEntries) {
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

function isReservedPublicImage(assetPath: string): boolean {
  return (
    !assetPath.includes("/") ||
    assetPath === ATTACHMENTS_PUBLIC_ROOT ||
    assetPath.startsWith(`${ATTACHMENTS_PUBLIC_ROOT}/`)
  );
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

async function getFileStats(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (isFileNotFoundError(error)) return null;
    throw error;
  }
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

if (isDirectExecution()) {
  buildImages().catch((error) => {
    console.error("Failed to build images:", error);
    process.exitCode = 1;
  });
}

function isDirectExecution(): boolean {
  return process.argv[1]
    ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
    : false;
}
