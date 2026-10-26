import {
  type ContentManifest,
  type ContentSource,
  type Diagnostic,
  type PluginPage,
  readContentSourceEntry,
} from "@riebeckite/core";
import { parseCanvas } from "./parse.js";
import { renderCanvas, renderCanvasPage } from "./render.js";
import { createCanvasResolver } from "./resolve.js";
import { finalizeCanvasNoteLinks } from "./runtime.js";
import type { CanvasDocument, ResolvedCanvasOptions } from "./types.js";

const PLUGIN_NAME = "canvas";
const CANVAS_SUFFIX = /\.canvas$/i;

type CanvasPageSource = {
  manifest: ContentManifest;
  contentIndex: Map<string, string>;
  contentSource?: ContentSource;
  diagnostics: Diagnostic[];
};

export async function listCanvasDocumentPaths(
  source: CanvasPageSource,
): Promise<string[]> {
  const paths: string[] = [];
  const claimed = new Set<string>();

  for (const slug of collectCanvasSlugs(source.manifest)) {
    const path = canvasDocumentPath(slug);
    if (!path || claimed.has(path)) continue;

    if (isContentRoute(source.manifest, path)) {
      source.diagnostics.push({
        code: "canvas-page-conflict",
        severity: "warning",
        pluginName: PLUGIN_NAME,
        message: `Canvas page \`${path}\` is already served by a Markdown route; the Canvas page is skipped.`,
        target: slug,
      });
      continue;
    }

    if (!source.contentSource) continue;

    const document = await readCanvasDocument(source.contentSource, slug);
    if (!document) {
      source.diagnostics.push({
        code: "canvas-invalid",
        severity: "warning",
        pluginName: PLUGIN_NAME,
        message: `Canvas \`${slug}\` is not valid JSON Canvas; no standalone page is generated.`,
        target: slug,
      });
      continue;
    }

    claimed.add(path);
    paths.push(path);
  }

  return paths;
}

export async function resolveCanvasDocument(
  context: CanvasPageSource & { pathname: string },
  options: ResolvedCanvasOptions,
): Promise<PluginPage | null> {
  const slug = findCanvasSlug(context.manifest, context.pathname);
  if (!slug || !context.contentSource) return null;
  if (isContentRoute(context.manifest, context.pathname)) return null;

  const document = await readCanvasDocument(context.contentSource, slug);
  if (!document) return null;

  const title = canvasTitle(slug);
  const canvas = renderCanvas({
    document,
    source: slug,
    options,
    resolver: createCanvasResolver(context.contentIndex),
  });
  const body = finalizeCanvasNoteLinks(
    renderCanvasPage({ title, canvas }),
    context.manifest,
  );

  return { type: "canvas-document", pathname: context.pathname, title, body };
}

function collectCanvasSlugs(manifest: ContentManifest): string[] {
  const slugs = new Set<string>();
  for (const entry of manifest.publicEntries) {
    for (const link of entry.links) {
      if (link.kind !== "attachment") continue;
      if (!link.slug) continue;
      if (!CANVAS_SUFFIX.test(link.slug)) continue;
      slugs.add(link.slug);
    }
  }
  return [...slugs].sort();
}

function findCanvasSlug(
  manifest: ContentManifest,
  pathname: string,
): string | null {
  for (const slug of collectCanvasSlugs(manifest)) {
    if (canvasDocumentPath(slug) === pathname) return slug;
  }
  return null;
}

function canvasDocumentPath(slug: string): string | null {
  const path = normalizePath(slug).replace(CANVAS_SUFFIX, "");
  if (!path || path === "/") return null;
  if (/\.[a-zA-Z0-9]+$/.test(path.slice(1))) return null;
  return path;
}

function canvasTitle(slug: string): string {
  const fileName = slug.split("/").at(-1) ?? slug;
  return fileName.replace(CANVAS_SUFFIX, "");
}

function isContentRoute(manifest: ContentManifest, path: string): boolean {
  return (
    manifest.byRoutablePermalink.has(path) || manifest.publicRedirects.has(path)
  );
}

async function readCanvasDocument(
  source: ContentSource,
  slug: string,
): Promise<CanvasDocument | null> {
  try {
    const raw = await readContentSourceEntry(source, slug);
    if (raw === null) return null;
    const json = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    return parseCanvas(json);
  } catch {
    return null;
  }
}

function normalizePath(pathname: string): string {
  const collapsed = `/${pathname.split("/").filter(Boolean).join("/")}`;
  return collapsed === "/" ? "/" : collapsed.replace(/\/+$/, "");
}
