import fs from "node:fs/promises";
import path from "node:path";
import { IMAGE_EXTENSIONS, isAttachmentPath } from "@riebeckite/core";
import {
  ATTACHMENTS_PUBLIC_ROOT,
  type ContentAttachment,
  type ContentImage,
} from "./build_images_config.js";
import {
  fileExists,
  getExtension,
  isReservedPublicImage,
  normalizeAssetPath,
} from "./build_images_copy.js";

export async function collectContentAttachments(
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

export async function removeOrphanedAttachments(
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

export async function collectContentImages(
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

export async function removeOrphanedImages(
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
