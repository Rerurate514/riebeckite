import fs from "node:fs/promises";
import path from "node:path";
import { isImagePath, normalizeContentPath } from "@riebeckite/core";
import { isIgnoredContentPath, isPathInsideDirectory } from "@riebeckite/node";
import type { Plugin } from "vite";
import { loadContentModule } from "./content_module.js";

type RiebeckiteContentAssetsOptions = {
  appRoot: () => string;
  contentRoot: () => string;
};

type ContentAssetEntry = { assets?: ReadonlyArray<{ path: string }> };

type GeneratedOutputEntry = {
  path: string;
  content?: Uint8Array | string;
  generate?: () => Uint8Array | string | Promise<Uint8Array | string>;
};

type DeferredGeneratedImage = {
  generate: () => Uint8Array | string | Promise<Uint8Array | string>;
};

export type PublicContentManifest = {
  publicEntries?: ReadonlyArray<ContentAssetEntry>;
  generatedOutputs?: ReadonlyArray<GeneratedOutputEntry>;
};

type PublicContentAssets = {
  readonly paths: ReadonlySet<string>;
  readonly generated: ReadonlyMap<string, Uint8Array | string>;
  readonly deferred: ReadonlyMap<string, DeferredGeneratedImage>;
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
  avif: "image/avif",
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
      const base = server.config.base;
      const publicDir = server.config.publicDir;
      let cachedManifest: unknown;
      let cachedAssets: PublicContentAssets = {
        paths: new Set<string>(),
        generated: new Map<string, Uint8Array | string>(),
        deferred: new Map<string, DeferredGeneratedImage>(),
      };
      const deferredContents = new Map<string, Promise<Uint8Array | string>>();

      const resolvePublicAssets = async (): Promise<PublicContentAssets> => {
        const module = await loadContentModule(server, options.appRoot());
        const manifest = (await module.content?.getManifest?.()) as
          | PublicContentManifest
          | undefined;
        if (!manifest) {
          return {
            paths: new Set(),
            generated: new Map(),
            deferred: new Map(),
          };
        }
        if (manifest !== cachedManifest) {
          cachedManifest = manifest;
          deferredContents.clear();
          cachedAssets = {
            paths: collectPublicImagePaths(manifest),
            generated: collectGeneratedImageContents(manifest),
            deferred: collectDeferredGeneratedImages(manifest),
          };
        }
        return cachedAssets;
      };

      const middleware: AssetMiddleware = async (request, response, next) => {
        try {
          if (request.method !== "GET" && request.method !== "HEAD") {
            next();
            return;
          }
          const logicalPath = toContentPath(request.url, base);
          if (!logicalPath) {
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
          const available = await resolvePublicAssets();
          const generated = available.generated.get(logicalPath);
          const deferred = available.deferred.get(logicalPath);
          if (
            generated === undefined &&
            deferred === undefined &&
            !available.paths.has(logicalPath)
          ) {
            next();
            return;
          }
          if (await hasSiteOwnedFile(publicDir, logicalPath)) {
            next();
            return;
          }
          if (generated !== undefined) {
            sendImage(request, response, contentType, generated);
            return;
          }
          if (deferred !== undefined) {
            const content = await resolveDeferredImage(
              deferredContents,
              logicalPath,
              deferred,
            );
            sendImage(request, response, contentType, content);
            return;
          }
          const file = path.join(contentRoot, logicalPath);
          if (!isPathInsideDirectory(contentRoot, file)) {
            next();
            return;
          }
          const content = await fs.readFile(file);
          sendImage(request, response, contentType, content);
          return;
        } catch {
          next();
        }
      };

      server.middlewares.use((request, response, next) => {
        void middleware(request, response, next);
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

export function collectGeneratedImageContents(
  manifest: PublicContentManifest,
): Map<string, Uint8Array | string> {
  const contents = new Map<string, Uint8Array | string>();
  for (const output of manifest.generatedOutputs ?? []) {
    if (output.content === undefined) continue;
    const normalized = normalizeContentPath(output.path);
    if (!imageContentType(normalized)) continue;
    contents.set(normalized, output.content);
  }
  return contents;
}

export function collectDeferredGeneratedImages(
  manifest: PublicContentManifest,
): Map<string, DeferredGeneratedImage> {
  const outputs = new Map<string, DeferredGeneratedImage>();
  for (const output of manifest.generatedOutputs ?? []) {
    if (!output.generate) continue;
    const normalized = normalizeContentPath(output.path);
    if (!imageContentType(normalized)) continue;
    outputs.set(normalized, { generate: output.generate });
  }
  return outputs;
}

async function resolveDeferredImage(
  cache: Map<string, Promise<Uint8Array | string>>,
  logicalPath: string,
  output: DeferredGeneratedImage,
): Promise<Uint8Array | string> {
  const cached = cache.get(logicalPath);
  if (cached) return await cached;
  const content = Promise.resolve().then(output.generate);
  cache.set(logicalPath, content);
  try {
    return await content;
  } catch (error) {
    cache.delete(logicalPath);
    throw error;
  }
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

function sendImage(
  request: AssetRequest,
  response: AssetResponse,
  contentType: string,
  content: Uint8Array | string,
): void {
  const body = typeof content === "string" ? Buffer.from(content) : content;
  response.statusCode = 200;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Length", String(body.byteLength));
  response.setHeader("Cache-Control", "no-cache");
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  response.end(body);
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
