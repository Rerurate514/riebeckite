import fs from "node:fs/promises";
import path from "node:path";
import { ContentManager } from "@riebeckite/core";
import { createContentSource } from "@riebeckite/node";
import {
  readAssetReferenceCache,
  writeAssetReferenceCache,
} from "./build_images_cache.js";
import {
  ASSET_REFERENCE_CACHE_VERSION,
  appRoot,
  type config,
  type ReferencedAssets,
} from "./build_images_config.js";

export async function collectReferencedAssets(
  contentDir: string,
  assetsRoot: string,
  exclude: readonly string[],
  appConfig: typeof config,
): Promise<ReferencedAssets> {
  const cachePath = path.join(
    appRoot,
    ".riebeckite",
    "build-images-cache.json",
  );
  const cacheKey = JSON.stringify({
    contentDir,
    assetsRoot,
    exclude,
    filters: appConfig.content.filters,
  });
  const digest = await markdownFingerprint(contentDir);
  const cached = await readAssetReferenceCache(cachePath);
  if (
    cached?.version === ASSET_REFERENCE_CACHE_VERSION &&
    cached.key === cacheKey &&
    cached.fingerprint === digest &&
    (cached.expiresAt === null || Date.now() < cached.expiresAt)
  ) {
    console.log("Content asset references: cache hit");
    return {
      images: new Set(cached.images),
      attachments: new Set(cached.attachments),
    };
  }

  const content = new ContentManager(
    createContentSource({
      ...appConfig.content,
      directory: contentDir,
      exclude,
    }),
    [],
    { config: { ...appConfig, plugins: [] }, commitBuildState: false },
  );
  try {
    const references = await content.getPublicAssetReferences();
    await writeAssetReferenceCache(cachePath, {
      version: ASSET_REFERENCE_CACHE_VERSION,
      key: cacheKey,
      fingerprint: digest,
      expiresAt: references.nextPublishAt,
      images: [...references.images],
      attachments: [...references.attachments],
    });
    return references;
  } finally {
    await content.dispose();
  }
}

export async function markdownFingerprint(contentDir: string): Promise<string> {
  const entries = await fs.readdir(contentDir, {
    recursive: true,
    withFileTypes: true,
  });
  const files = entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"),
    )
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
  const parts: string[] = [];
  const batchSize = 64;
  for (let index = 0; index < files.length; index += batchSize) {
    const batch = files.slice(index, index + batchSize);
    const stats = await Promise.all(
      batch.map(async (file) => {
        const stat = await fs.stat(file);
        return `${path.relative(contentDir, file).replaceAll("\\", "/")}\0${stat.size}\0${stat.mtimeMs}`;
      }),
    );
    parts.push(...stats);
  }
  return parts.join("\n");
}
