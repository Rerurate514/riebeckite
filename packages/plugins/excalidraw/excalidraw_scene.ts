import type {
  ContentManifest,
  ContentManifestEntry,
  PluginPage,
  PluginPageContext,
  PluginPagePath,
  PluginRenderContext,
} from "@riebeckite/core";
import {
  getFileName,
  getPathExtension,
  mergeEmbeddedFiles,
  readText,
} from "./excalidraw_files.js";
import type { ExcalidrawSession } from "./excalidraw_shared.js";
import { EMPTY_SCENE_SVG } from "./excalidraw_shared.js";
import {
  isObsidianExcalidrawMarkdown,
  parseExcalidrawScene,
} from "./src/parse.js";
import { renderExcalidrawFigure, renderExcalidrawPage } from "./src/render.js";
import type { ExcalidrawScene } from "./src/types.js";

export async function renderSceneSvg(
  session: ExcalidrawSession,
  scene: ExcalidrawScene,
): Promise<string> {
  if (scene.elements.length === 0) return EMPTY_SCENE_SVG;
  return session.render(scene);
}

export async function renderAttachment(
  context: PluginRenderContext,
  session: ExcalidrawSession,
): Promise<string | null> {
  if (context.kind !== "attachment") return null;
  if (!isExcalidrawPath(context.path)) return null;
  if (!context.embed) return null;

  if (!context.contentSource) {
    return renderExcalidrawFigure({
      title: getFileName(context.path),
      error: "Content source is not available.",
    });
  }

  try {
    const raw = await readText(context.contentSource, context.path);
    if (raw === null) return null;
    if (!isExcalidrawDocument(context.path, raw)) return null;

    const parsed = await parseExcalidrawScene(raw, context.path);
    const scene = await mergeEmbeddedFiles({
      scene: parsed.scene,
      embeddedFiles: parsed.embeddedFiles,
      contentSource: context.contentSource,
      contentIndex: context.contentIndex,
    });
    return renderExcalidrawFigure({
      title: getFileName(context.path),
      svg: await renderSceneSvg(session, scene),
      size: parseSize(context.label),
    });
  } catch (error) {
    console.error("[plugin-excalidraw] Failed to render Excalidraw", {
      path: context.path,
      error,
    });
    return renderExcalidrawFigure({
      title: getFileName(context.path),
      error: "Excalidraw could not be rendered.",
    });
  }
}

export function isExcalidrawPath(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  return (
    lowerPath.endsWith(".excalidraw") ||
    lowerPath.endsWith(".excalidraw.md") ||
    lowerPath.endsWith(".md")
  );
}

export function isExcalidrawDocument(filePath: string, raw: string): boolean {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith(".excalidraw")) return true;
  if (lowerPath.endsWith(".excalidraw.md")) return true;
  return lowerPath.endsWith(".md") && isObsidianExcalidrawMarkdown(raw);
}

export function listExcalidrawDocumentPaths(
  manifest: ContentManifest,
): PluginPagePath[] {
  const paths = new Map<string, Set<string>>();
  for (const entry of manifest.publicEntries) {
    const path = getExcalidrawPagePath(entry);
    if (!path) continue;
    const sources = paths.get(path) ?? new Set<string>();
    sources.add(entry.slug);
    paths.set(path, sources);
  }
  return [...paths].map(([pathname, sources]) => ({
    pathname,
    sourceSlugs: [...sources],
  }));
}

export function isExcalidrawEntry(entry: ContentManifestEntry): boolean {
  if (entry.slug.toLowerCase().endsWith(".excalidraw")) return true;
  return entry.frontmatter["excalidraw-plugin"] === "parsed";
}

export function getExcalidrawPagePath(
  entry: ContentManifestEntry,
): string | null {
  if (!isExcalidrawEntry(entry)) return null;

  const path = normalizePath(entry.permalink).replace(/\.excalidraw$/i, "");
  if (!path || path === "/") return null;
  if (/\.[a-zA-Z0-9]+$/.test(path.slice(1))) return null;
  return path;
}

export function findExcalidrawEntry(
  manifest: ContentManifest,
  pathname: string,
): ContentManifestEntry | null {
  for (const entry of manifest.publicEntries) {
    if (getExcalidrawPagePath(entry) === pathname) return entry;
  }
  return null;
}

export async function resolveExcalidrawDocument(
  context: PluginPageContext,
  session: ExcalidrawSession,
): Promise<PluginPage | null> {
  const entry = findExcalidrawEntry(context.manifest, context.pathname);
  if (!entry) return null;

  const title = resolveEntryTitle(entry);
  const description =
    typeof entry.frontmatter.description === "string"
      ? entry.frontmatter.description
      : undefined;

  if (!context.contentSource) {
    return {
      type: "excalidraw-document",
      layout: "wide",
      pathname: context.pathname,
      title,
      description,
      body: renderExcalidrawPage({
        title,
        error: "Content source is not available.",
      }),
    };
  }

  const sourcePath = `${entry.slug}.md`;
  try {
    const raw = await readText(context.contentSource, sourcePath);
    if (raw === null) return null;

    const parsed = await parseExcalidrawScene(raw, sourcePath);
    const scene = await mergeEmbeddedFiles({
      scene: parsed.scene,
      embeddedFiles: parsed.embeddedFiles,
      contentSource: context.contentSource,
      contentIndex: context.contentIndex,
    });

    return {
      type: "excalidraw-document",
      layout: "wide",
      pathname: context.pathname,
      title,
      description,
      body: renderExcalidrawPage({
        title,
        svg: await renderSceneSvg(session, scene),
      }),
    };
  } catch (error) {
    console.error("[plugin-excalidraw] Failed to render Excalidraw page", {
      path: sourcePath,
      error,
    });
    return {
      type: "excalidraw-document",
      layout: "wide",
      pathname: context.pathname,
      title,
      description,
      body: renderExcalidrawPage({
        title,
        error: "Excalidraw could not be rendered.",
      }),
    };
  }
}

export function resolveEntryTitle(entry: ContentManifestEntry): string {
  const trimmed = entry.title.trim().replace(/\.excalidraw$/i, "");
  if (trimmed) return trimmed;
  return getFileName(entry.slug).replace(/\.excalidraw$/i, "");
}

export function normalizePath(pathname: string): string {
  const collapsed = `/${pathname.split("/").filter(Boolean).join("/")}`;
  return collapsed === "/" ? "/" : collapsed.replace(/\/+$/, "");
}

export function parseSize(
  label: string,
): { width?: number; height?: number } | undefined {
  const value = label.trim();
  if (/^\d{1,5}$/.test(value)) return { width: Number(value) };

  const match = value.match(/^(\d{1,5})x(\d{1,5})$/i);
  if (!match?.[1] || !match[2]) return undefined;
  return { width: Number(match[1]), height: Number(match[2]) };
}

export function resolveMarkdownTarget(
  rawTarget: string,
  contentIndex: Map<string, string>,
): string | null {
  const target = rawTarget.toLowerCase();
  const targetExtension = getPathExtension(target);
  if (targetExtension && targetExtension !== "md") return null;

  const indexKey = target.endsWith(".md") ? target.slice(0, -3) : target;
  const resolved = contentIndex.get(indexKey);
  if (!resolved) return null;
  const resolvedExtension = getPathExtension(resolved);
  if (resolvedExtension && resolvedExtension !== "md") return null;

  return resolved.toLowerCase().endsWith(".md") ? resolved : `${resolved}.md`;
}
