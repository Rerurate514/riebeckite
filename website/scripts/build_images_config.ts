import { fileURLToPath } from "node:url";
import { ATTACHMENTS_BASE_PATH, resolveConfigModule } from "@riebeckite/core";
import { resolveHonoxConfig } from "@riebeckite/honox/runtime";
import * as rawConfigModule from "../riebeckite.config";

export const appRoot = fileURLToPath(new URL("../", import.meta.url));

export const config = resolveHonoxConfig(
  resolveConfigModule(rawConfigModule),
  appRoot,
);

export const CONTENT_DIR = config.content.directory;

export const ASSETS_ROOT = "public/";

export const ATTACHMENTS_PUBLIC_ROOT = ATTACHMENTS_BASE_PATH.replace(
  /^\/+/,
  "",
);

export const ASSET_REFERENCE_CACHE_VERSION = 3;

export type ContentImage = {
  sourcePath: string;
  targetPath: string;
  relativePath: string;
};

export type ContentAttachment = ContentImage;

export type ReferencedAssets = {
  images: ReadonlySet<string>;
  attachments: ReadonlySet<string>;
};

export type AssetReferenceCache = {
  version: 3;
  key: string;
  fingerprint: string;
  expiresAt: number | null;
  images: string[];
  attachments: string[];
};

export type CopyResult = "copied" | "skipped";

export type BuildImagesOptions = {
  contentDir?: string;
  assetsRoot?: string;
  exclude?: readonly string[];
};
