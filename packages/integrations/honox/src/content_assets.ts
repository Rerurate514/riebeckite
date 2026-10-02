import fs from "node:fs/promises";
import path from "node:path";
import {
  isIgnoredContentPath,
  isImagePath,
  normalizeContentPath,
} from "@riebeckite/core";
import type { Plugin } from "vite";
import { isPathInsideDirectory } from "./content_watch.js";

export type RiebeckiteContentAssetsOptions = {
  appRoot: () => string;
  contentRoot: () => string;
};

type ContentAssetEntry = { assets?: ReadonlyArray<{ path: string }> };

type PublicContentManifest = {
  publicEntries?: ReadonlyArray<ContentAssetEntry>;
};

type ContentAppModule = {
  content?: { getManifest: () => Promise<unknown> };
};

type AssetRequest = {
  method?: string;
  url?: string;
};

type AssetResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: Uint8Array | string): void;
};

type AssetMiddleware = (
  request: AssetRequest,
  response: AssetResponse,
  next: () => void,
) => Promise<void> | void;

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  bmp: "image/bmp",
};

export function riebeckiteContentAssets(
  options: RiebeckiteContentAssetsOptions,
): Plugin {
  return {
    name: "riebeckite-content-assets",
    apply: "serve",
    enforce: "pre",
    configureServer(server) {
      const contentRoot = options.contentRoot();
      const entry = path.join(options.appRoot(), "app", "server.ts");
      const base = server.config.base;
      const publicDir = server.config.publicDir;
      let cachedManifest: unknown;
      let cachedPaths = new Set<string>();

      const resolvePublicImagePaths = async (): Promise<Set<string>> => {
        const module = (await server.ssrLoadModule(entry)) as ContentAppModule;
        const manifest = (await module.content?.getManifest()) as
          | PublicContentManifest
          | undefined;
        if (!manifest) return new Set();
        if (manifest !== cachedManifest) {
          cachedManifest = manifest;
          cachedPaths = collectPublicImagePaths(manifest);
        }
        return cachedPaths;
      };

      const middleware: AssetMiddleware = async (request, response, next) => {
        try {
          if (request.method !== "GET" && request.method !== "HEAD") {
            next();
            return;
          }
          const logicalPath = toContentPath(request.url, base);
          if (!logicalPath || !isImagePath(logicalPath)) {
            next();
            return;
          }
          if (isIgnoredContentPath(logicalPath)) {
            next();
            return;
          }
          const contentType = imageContentType(logicalPath);
          if (!contentType) {
            next();
            return;
          }
          const available = await resolvePublicImagePaths();
          if (!available.has(logicalPath)) {
            next();
            return;
          }
          const file = path.join(contentRoot, logicalPath);
          if (!isPathInsideDirectory(contentRoot, file)) {
            next();
            return;
          }
          if (await hasSiteOwnedFile(publicDir, logicalPath)) {
            next();
            return;
          }
          const content = await fs.readFile(file);
          response.statusCode = 200;
          response.setHeader("Content-Type", contentType);
          response.setHeader("Content-Length", String(content.byteLength));
          response.setHeader("Cache-Control", "no-cache");
          if (request.method === "HEAD") {
            response.end();
            return;
          }
          response.end(content);
          return;
        } catch {
          next();
        }
      };

      server.middlewares.use((request, response, next) => {
        void middleware(
          request as unknown as AssetRequest,
          response as unknown as AssetResponse,
          next,
        );
      });
    },
  };
}

export function collectPublicImagePaths(
  manifest: PublicContentManifest,
): Set<string> {
  const paths = new Set<string>();
  for (const entry of manifest.publicEntries ?? []) {
    for (const asset of entry.assets ?? []) {
      const normalized = normalizeContentPath(asset.path);
      if (isImagePath(normalized)) paths.add(normalized);
    }
  }
  return paths;
}

export async function collectSiteOwnedOutputPaths(
  publicDir: string | false | undefined,
): Promise<Set<string>> {
  const paths = new Set<string>();
  if (!publicDir) return paths;
  const root = path.resolve(publicDir);

  const walk = async (directory: string): Promise<void> => {
    const entries = await fs
      .readdir(directory, { withFileTypes: true })
      .catch(() => undefined);
    if (!entries) return;
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        paths.add(path.relative(root, full).replaceAll("\\", "/"));
      }
    }
  };

  await walk(root);
  return paths;
}

export function toContentPath(
  url: string | undefined,
  base: string,
): string | undefined {
  if (!url) return undefined;
  const withoutQuery = url.split("?")[0]?.split("#")[0];
  if (!withoutQuery) return undefined;
  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    return undefined;
  }
  let pathname = normalizeContentPath(decoded);
  if (base && base !== "/" && pathname.startsWith(base)) {
    pathname = normalizeContentPath(pathname.slice(base.length));
  }
  const logicalPath = pathname.replace(/^\/+/, "");
  if (!logicalPath) return undefined;
  if (
    logicalPath
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    return undefined;
  }
  return logicalPath;
}

export function imageContentType(logicalPath: string): string | undefined {
  const extension = logicalPath.split("/").at(-1)?.split(".").at(-1);
  if (!extension) return undefined;
  return IMAGE_CONTENT_TYPES[extension.toLowerCase()];
}

async function hasSiteOwnedFile(
  publicDir: string,
  logicalPath: string,
): Promise<boolean> {
  if (!publicDir) return false;
  const file = path.join(publicDir, logicalPath);
  try {
    return (await fs.stat(file)).isFile();
  } catch {
    return false;
  }
}
