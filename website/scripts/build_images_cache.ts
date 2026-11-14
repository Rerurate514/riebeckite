import fs, { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  ASSET_REFERENCE_CACHE_VERSION,
  type AssetReferenceCache,
} from "./build_images_config.js";
import { isStringArray } from "./build_images_copy.js";

export async function readAssetReferenceCache(
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

export async function writeAssetReferenceCache(
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
