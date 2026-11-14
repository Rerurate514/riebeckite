import fs from "node:fs/promises";
import { collectReferencedAssets } from "./build_images_assets.js";
import {
  collectContentAttachments,
  collectContentImages,
  removeOrphanedAttachments,
  removeOrphanedImages,
} from "./build_images_collect.js";
import {
  ASSETS_ROOT,
  type BuildImagesOptions,
  CONTENT_DIR,
  config,
} from "./build_images_config.js";
import {
  copyIfChanged,
  fileExists,
  isDirectExecution,
} from "./build_images_copy.js";

export async function buildImages(options: BuildImagesOptions = {}) {
  const contentDir = options.contentDir ?? CONTENT_DIR;
  const assetsRoot = options.assetsRoot ?? ASSETS_ROOT;
  const exclude = options.exclude ?? config.content.exclude;
  const images = await collectContentImages(contentDir, assetsRoot);
  const attachments = await collectContentAttachments(contentDir, assetsRoot);
  const referencedAssets = await collectReferencedAssets(
    contentDir,
    assetsRoot,
    exclude,
    config,
  );

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
  return { copied, skipped, removed, failed };
}

if (isDirectExecution()) {
  buildImages().catch((error) => {
    console.error("Failed to build images:", error);
    process.exitCode = 1;
  });
}
