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
import { createContentSource } from "@riebeckite/node";
import * as rawConfigModule from "../riebeckite.config";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const config = resolveHonoxConfig(
  resolveConfigModule(rawConfigModule),
  appRoot,
);
const CONTENT_DIR = config.content.directory;
const ASSETS_ROOT = "public/";

const ATTACHMENTS_PUBLIC_ROOT = ATTACHMENTS_BASE_PATH.replace(/^\/+/, "");

type ContentImage = {
  sourcePath: string;
  targetPath: string;
  relativePath: string;
};

type ContentAttachment = ContentImage;

type ReferencedAssets = {
  images: ReadonlySet<string>;
  attachments: ReadonlySet<string>;
};

type AssetReferenceCache = {
  version: 3;
  key: string;
  fingerprint: string;
  expiresAt: number | null;
  images: string[];
  attachments: string[];
};

const ASSET_REFERENCE_CACHE_VERSION = 3;

type CopyResult = "copied" | "skipped";

type BuildImagesOptions = {
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

async function copyIfChanged(
  sourcePath: string,
  targetPath: string,
): Promise<CopyResult> {
  const sourceStats = await fs.stat(sourcePath);
  const targetStats = await getFileStats(targetPath);

  if (
    targetStats !== null &&
    sourceStats.size === targetStats.size &&
    Math.abs(sourceStats.mtimeMs - targetStats.mtimeMs) < 1
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

async function markdownFingerprint(contentDir: string): Promise<string> {
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

async function readAssetReferenceCache(
  cachePath: string,
): Promise<AssetReferenceCache | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(cachePath, "utf8")) as {
      version?: unknown;
      key?: unknown;
      fingerprint?: unknown;
      expiresAt?: unknown;
      images?: unknown;
      attachments?: unknown;
    };
    if (
      parsed.version !== ASSET_REFERENCE_CACHE_VERSION ||
      typeof parsed.key !== "string" ||
      typeof parsed.fingerprint !== "string" ||
      !isStringArray(parsed.images) ||
      !isStringArray(parsed.attachments)
    ) {
      return null;
    }
    if (parsed.expiresAt !== null && typeof parsed.expiresAt !== "number") {
      return null;
    }
    return {
      version: parsed.version,
      key: parsed.key,
      fingerprint: parsed.fingerprint,
      expiresAt: parsed.expiresAt,
      images: parsed.images,
      attachments: parsed.attachments,
    };
  } catch {
    return null;
  }
}

async function writeAssetReferenceCache(
  cachePath: string,
  cache: AssetReferenceCache,
): Promise<void> {
  try {
    await mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to write content asset reference cache:", error);
  }
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item): item is string => typeof item === "string")
  );
}

function normalizeAssetPath(assetPath: string): string {
  return normalizeContentPath(assetPath);
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
