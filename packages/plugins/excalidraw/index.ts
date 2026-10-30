import type {
  ContentManifest,
  ContentManifestEntry,
  ContentSource,
  PluginPage,
  PluginPageContext,
  PluginPagePath,
  PluginRenderContext,
} from "@riebeckite/core";
import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
  IMAGE_EXTENSIONS,
  readContentSourceEntry,
} from "@riebeckite/core";
import type { Content, Html, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";
import {
  isObsidianExcalidrawMarkdown,
  parseExcalidrawScene,
} from "./src/parse.js";
import {
  renderExcalidrawPage,
  renderExcalidrawPlaceholder,
} from "./src/render.js";
import type {
  ExcalidrawOptions,
  ExcalidrawScene,
  ObsidianEmbeddedFile,
} from "./src/types.js";

const PLUGIN_NAME = "excalidraw";

export type { ExcalidrawOptions } from "./src/types.js";

export function excalidraw(options: ExcalidrawOptions = {}) {
  return definePlugin({
    name: PLUGIN_NAME,
    order: -21,
    processedContentCache: {
      version: "excalidraw-v1",
      dependencyMode: "tracked",
    },
    options,
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(remarkExcalidrawMarkdownEmbed, {
        contentIndex: context.contentIndex,
        contentSource: context.contentSource,
        options,
      });
    },
    renderers: [
      {
        name: "excalidraw-embed",
        render: async (context) => renderAttachment(context, options),
      },
    ],
    pageTypes: [
      {
        id: "excalidraw-document",
        paths: ({ manifest }) => listExcalidrawDocumentPaths(manifest),
        outputDependencies: [{ type: "global" }],
        resolve: (context) => resolveExcalidrawDocument(context, options),
        resolveRoute: (context) => resolveExcalidrawDocument(context, options),
      },
    ],
    assets: [
      createStyleAsset(PLUGIN_NAME, "@riebeckite/plugin-excalidraw/style.css"),
    ],
    clientEntries: [
      createClientEntry(
        PLUGIN_NAME,
        "@riebeckite/plugin-excalidraw/client",
        "initExcalidraw",
        undefined,
        undefined,
        "context",
      ),
    ],
  });
}

async function renderAttachment(
  context: PluginRenderContext,
  options: ExcalidrawOptions,
): Promise<string | null> {
  if (context.kind !== "attachment") return null;
  if (!isExcalidrawPath(context.path)) return null;
  if (!context.embed) return null;

  if (!context.contentSource) {
    return renderExcalidrawPlaceholder({
      title: getFileName(context.path),
      error: "Content source is not available.",
    });
  }

  try {
    const raw = await readText(context.contentSource, context.path);
    if (raw === null) return null;
    if (!isExcalidrawDocument(context.path, raw)) return null;

    const parsed = parseExcalidrawScene(raw, context.path);
    const scene = await mergeEmbeddedFiles({
      scene: parsed.scene,
      embeddedFiles: parsed.embeddedFiles,
      contentSource: context.contentSource,
      contentIndex: context.contentIndex,
    });
    return renderExcalidrawPlaceholder({
      title: getFileName(context.path),
      scene,
      size: parseSize(context.label),
      lazy: options.lazy !== false,
    });
  } catch (error) {
    console.error("[plugin-excalidraw] Failed to render Excalidraw", {
      path: context.path,
      error,
    });
    return renderExcalidrawPlaceholder({
      title: getFileName(context.path),
      error: "Excalidraw could not be rendered.",
    });
  }
}

function isExcalidrawPath(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  return (
    lowerPath.endsWith(".excalidraw") ||
    lowerPath.endsWith(".excalidraw.md") ||
    lowerPath.endsWith(".md")
  );
}

function isExcalidrawDocument(filePath: string, raw: string): boolean {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith(".excalidraw")) return true;
  if (lowerPath.endsWith(".excalidraw.md")) return true;
  return lowerPath.endsWith(".md") && isObsidianExcalidrawMarkdown(raw);
}

function listExcalidrawDocumentPaths(
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

function isExcalidrawEntry(entry: ContentManifestEntry): boolean {
  if (entry.slug.toLowerCase().endsWith(".excalidraw")) return true;
  return entry.frontmatter["excalidraw-plugin"] === "parsed";
}

function getExcalidrawPagePath(entry: ContentManifestEntry): string | null {
  if (!isExcalidrawEntry(entry)) return null;

  const path = normalizePath(entry.permalink).replace(/\.excalidraw$/i, "");
  if (!path || path === "/") return null;
  if (/\.[a-zA-Z0-9]+$/.test(path.slice(1))) return null;
  return path;
}

function findExcalidrawEntry(
  manifest: ContentManifest,
  pathname: string,
): ContentManifestEntry | null {
  for (const entry of manifest.publicEntries) {
    if (getExcalidrawPagePath(entry) === pathname) return entry;
  }
  return null;
}

async function resolveExcalidrawDocument(
  context: PluginPageContext,
  options: ExcalidrawOptions,
): Promise<PluginPage | null> {
  const entry = findExcalidrawEntry(context.manifest, context.pathname);
  if (!entry) return null;

  const title = resolveEntryTitle(entry);
  const description =
    typeof entry.frontmatter.description === "string"
      ? entry.frontmatter.description
      : undefined;
  const lazy = options.lazy !== false;

  if (!context.contentSource) {
    return {
      type: "excalidraw-document",
      pathname: context.pathname,
      title,
      description,
      body: renderExcalidrawPage({
        title,
        lazy,
        error: "Content source is not available.",
      }),
    };
  }

  const sourcePath = `${entry.slug}.md`;
  try {
    const raw = await readText(context.contentSource, sourcePath);
    if (raw === null) return null;

    const parsed = parseExcalidrawScene(raw, sourcePath);
    const scene = await mergeEmbeddedFiles({
      scene: parsed.scene,
      embeddedFiles: parsed.embeddedFiles,
      contentSource: context.contentSource,
      contentIndex: context.contentIndex,
    });

    return {
      type: "excalidraw-document",
      pathname: context.pathname,
      title,
      description,
      body: renderExcalidrawPage({ title, scene, lazy }),
    };
  } catch (error) {
    console.error("[plugin-excalidraw] Failed to render Excalidraw page", {
      path: sourcePath,
      error,
    });
    return {
      type: "excalidraw-document",
      pathname: context.pathname,
      title,
      description,
      body: renderExcalidrawPage({
        title,
        lazy,
        error: "Excalidraw could not be rendered.",
      }),
    };
  }
}

function resolveEntryTitle(entry: ContentManifestEntry): string {
  const trimmed = entry.title.trim().replace(/\.excalidraw$/i, "");
  if (trimmed) return trimmed;
  return getFileName(entry.slug).replace(/\.excalidraw$/i, "");
}

function normalizePath(pathname: string): string {
  const collapsed = `/${pathname.split("/").filter(Boolean).join("/")}`;
  return collapsed === "/" ? "/" : collapsed.replace(/\/+$/, "");
}

function parseSize(
  label: string,
): { width?: number; height?: number } | undefined {
  const value = label.trim();
  if (/^\d{1,5}$/.test(value)) return { width: Number(value) };

  const match = value.match(/^(\d{1,5})x(\d{1,5})$/i);
  if (!match?.[1] || !match[2]) return undefined;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function resolveMarkdownTarget(
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

function remarkExcalidrawMarkdownEmbed(input: {
  contentIndex: Map<string, string>;
  contentSource?: ContentSource;
  options: ExcalidrawOptions;
}) {
  return async (tree: Root) => {
    const replacements: { node: Text; index: number; parent: Parent }[] = [];

    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (!node.value.includes("![[")) return;
      replacements.push({ node, index, parent });
    });

    for (const replacement of replacements.reverse()) {
      await replaceExcalidrawMarkdownEmbeds(replacement, input);
    }
  };
}

async function replaceExcalidrawMarkdownEmbeds(
  replacement: { node: Text; index: number; parent: Parent },
  input: {
    contentIndex: Map<string, string>;
    contentSource?: ContentSource;
    options: ExcalidrawOptions;
  },
) {
  const nodes: Content[] = [];
  const wikilinkRe = /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
  let lastIndex = 0;

  for (
    let match = wikilinkRe.exec(replacement.node.value);
    match !== null;
    match = wikilinkRe.exec(replacement.node.value)
  ) {
    const full = match[0];
    const rawTarget = match[1]?.trim() ?? "";
    const label = match[2]?.trim() ?? rawTarget;
    const start = match.index;
    const resolved = resolveMarkdownTarget(rawTarget, input.contentIndex);
    const html = resolved
      ? await renderExcalidrawMarkdownEmbed({
          path: resolved,
          label,
          contentIndex: input.contentIndex,
          contentSource: input.contentSource,
          options: input.options,
        })
      : null;

    if (!html) continue;

    if (start > lastIndex) {
      nodes.push({
        type: "text",
        value: replacement.node.value.slice(lastIndex, start),
      });
    }
    nodes.push({ type: "html", value: html } satisfies Html);
    lastIndex = start + full.length;
  }

  if (lastIndex === 0) return;
  if (lastIndex < replacement.node.value.length) {
    nodes.push({
      type: "text",
      value: replacement.node.value.slice(lastIndex),
    });
  }
  replacement.parent.children.splice(replacement.index, 1, ...nodes);
}

async function renderExcalidrawMarkdownEmbed(input: {
  path: string;
  label: string;
  contentIndex: Map<string, string>;
  contentSource?: ContentSource;
  options: ExcalidrawOptions;
}): Promise<string | null> {
  if (!input.contentSource) return null;
  const raw = await readText(input.contentSource, input.path);
  if (raw === null) return null;
  if (!isObsidianExcalidrawMarkdown(raw)) return null;

  const parsed = parseExcalidrawScene(raw, input.path);
  const scene = await mergeEmbeddedFiles({
    scene: parsed.scene,
    embeddedFiles: parsed.embeddedFiles,
    contentSource: input.contentSource,
    contentIndex: input.contentIndex,
  });

  return renderExcalidrawPlaceholder({
    title: getFileName(input.path),
    scene,
    size: parseSize(input.label),
    lazy: input.options.lazy !== false,
  });
}

async function mergeEmbeddedFiles(input: {
  scene: ExcalidrawScene;
  embeddedFiles: readonly ObsidianEmbeddedFile[];
  contentSource: ContentSource;
  contentIndex: Map<string, string>;
}): Promise<ExcalidrawScene> {
  const resolvedFiles = await resolveEmbeddedFiles(input);
  return {
    ...input.scene,
    files: {
      ...(input.scene.files ?? {}),
      ...resolvedFiles,
    },
  };
}

async function resolveEmbeddedFiles(input: {
  embeddedFiles: readonly ObsidianEmbeddedFile[];
  contentSource: ContentSource;
  contentIndex: Map<string, string>;
}): Promise<Record<string, Record<string, unknown>>> {
  const files: Record<string, Record<string, unknown>> = {};

  for (const embeddedFile of input.embeddedFiles) {
    const assetPath = input.contentIndex.get(embeddedFile.target.toLowerCase());
    if (!assetPath || !isSupportedImagePath(assetPath)) continue;

    try {
      const data = await readContentSourceEntry(input.contentSource, assetPath);
      if (data === null) continue;
      const mimeType = getImageMimeType(assetPath);
      files[embeddedFile.fileId] = {
        id: embeddedFile.fileId,
        dataURL: `data:${mimeType};base64,${toBase64(data)}`,
        mimeType,
        created: 0,
        lastRetrieved: 0,
      };
    } catch (error) {
      console.error("[plugin-excalidraw] Failed to resolve embedded file", {
        target: embeddedFile.target,
        error,
      });
    }
  }

  return files;
}

function isSupportedImagePath(filePath: string): boolean {
  const extension = getPathExtension(filePath);
  return IMAGE_EXTENSIONS.includes(extension);
}

function getImageMimeType(filePath: string): string {
  const extension = getPathExtension(filePath);
  if (extension === "jpg") return "image/jpeg";
  if (extension === "svg") return "image/svg+xml";
  return `image/${extension}`;
}

function getPathExtension(filePath: string): string {
  const fileName = getFileName(filePath.toLowerCase());
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart > 0 ? fileName.slice(extensionStart + 1) : "";
}

async function readText(
  source: ContentSource,
  logicalPath: string,
): Promise<string | null> {
  const content = await readContentSourceEntry(source, logicalPath);
  if (content === null) return null;
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

function toBase64(content: string | Uint8Array): string {
  const bytes =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  return Buffer.from(bytes).toString("base64");
}

function getFileName(contentPath: string): string {
  return contentPath.split("/").at(-1) ?? contentPath;
}
