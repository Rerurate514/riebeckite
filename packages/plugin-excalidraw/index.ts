import fs from "node:fs/promises";
import path from "node:path";
import type {
  PluginAttachmentRenderContext,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { definePlugin, IMAGE_EXTENSIONS } from "@riebeckite/core";
import type { Content, Html, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";
import {
  isObsidianExcalidrawMarkdown,
  parseExcalidrawScene,
} from "./src/parse.js";
import { renderExcalidrawPlaceholder } from "./src/render.js";
import type {
  ExcalidrawOptions,
  ExcalidrawScene,
  ObsidianEmbeddedFile,
} from "./src/types.js";

const PLUGIN_NAME = "excalidraw";

export type { ExcalidrawOptions } from "./src/types.js";

export function excalidraw(options: ExcalidrawOptions = {}) {
  let config: ResolvedRiebeckiteConfig | undefined;

  return definePlugin({
    name: PLUGIN_NAME,
    order: -21,
    options,
    onConfigResolved: (context) => {
      config = context.config;
    },
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(remarkExcalidrawMarkdownEmbed, {
        config,
        contentIndex: context.contentIndex,
        options,
      });
    },
    renderAttachment: async (context) => renderAttachment(context, options),
    assets: [
      {
        pluginName: PLUGIN_NAME,
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-excalidraw/style.css",
      },
    ],
    clientEntries: [
      {
        pluginName: PLUGIN_NAME,
        moduleSpecifier: "@riebeckite/plugin-excalidraw/client",
        exportName: "initExcalidraw",
      },
    ],
  });
}

export const excalidrawPlugin = excalidraw;

async function renderAttachment(
  context: PluginAttachmentRenderContext,
  options: ExcalidrawOptions,
): Promise<string | null> {
  if (!isExcalidrawPath(context.path)) return null;
  if (!context.embed) return null;

  const contentDirectory = context.config?.content.directory;
  if (!contentDirectory) {
    return renderExcalidrawPlaceholder({
      title: path.posix.basename(context.path),
      error: "Content directory is not available.",
    });
  }

  const sourcePath = path.resolve(contentDirectory, context.path);
  if (!isInsideDirectory(contentDirectory, sourcePath)) {
    return renderExcalidrawPlaceholder({
      title: path.posix.basename(context.path),
      error: "Invalid Excalidraw path.",
    });
  }

  try {
    const raw = await fs.readFile(sourcePath, "utf8");
    if (!isExcalidrawDocument(context.path, raw)) return null;

    const parsed = parseExcalidrawScene(raw, context.path);
    const scene = await mergeEmbeddedFiles({
      scene: parsed.scene,
      embeddedFiles: parsed.embeddedFiles,
      contentDirectory,
      contentIndex: context.contentIndex,
    });
    return renderExcalidrawPlaceholder({
      title: path.posix.basename(context.path),
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
      title: path.posix.basename(context.path),
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

function isInsideDirectory(directory: string, filePath: string): boolean {
  const relative = path.relative(directory, filePath);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
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
  config: ResolvedRiebeckiteConfig | undefined;
  contentIndex: Map<string, string>;
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
    config: ResolvedRiebeckiteConfig | undefined;
    contentIndex: Map<string, string>;
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
          config: input.config,
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
  config: ResolvedRiebeckiteConfig | undefined;
  options: ExcalidrawOptions;
}): Promise<string | null> {
  const contentDirectory = input.config?.content.directory;
  if (!contentDirectory) return null;
  const sourcePath = path.resolve(contentDirectory, input.path);
  if (!isInsideDirectory(contentDirectory, sourcePath)) return null;

  const raw = await fs.readFile(sourcePath, "utf8");
  if (!isObsidianExcalidrawMarkdown(raw)) return null;

  const parsed = parseExcalidrawScene(raw, input.path);
  const scene = await mergeEmbeddedFiles({
    scene: parsed.scene,
    embeddedFiles: parsed.embeddedFiles,
    contentDirectory,
    contentIndex: input.contentIndex,
  });

  return renderExcalidrawPlaceholder({
    title: path.posix.basename(input.path),
    scene,
    size: parseSize(input.label),
    lazy: input.options.lazy !== false,
  });
}

async function mergeEmbeddedFiles(input: {
  scene: ExcalidrawScene;
  embeddedFiles: readonly ObsidianEmbeddedFile[];
  contentDirectory: string;
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
  contentDirectory: string;
  contentIndex: Map<string, string>;
}): Promise<Record<string, Record<string, unknown>>> {
  const files: Record<string, Record<string, unknown>> = {};

  for (const embeddedFile of input.embeddedFiles) {
    const assetPath = input.contentIndex.get(embeddedFile.target.toLowerCase());
    if (!assetPath || !isSupportedImagePath(assetPath)) continue;

    const sourcePath = path.resolve(input.contentDirectory, assetPath);
    if (!isInsideDirectory(input.contentDirectory, sourcePath)) continue;

    try {
      const data = await fs.readFile(sourcePath);
      const mimeType = getImageMimeType(assetPath);
      files[embeddedFile.fileId] = {
        id: embeddedFile.fileId,
        dataURL: `data:${mimeType};base64,${data.toString("base64")}`,
        mimeType,
        created: Date.now(),
        lastRetrieved: Date.now(),
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
  const fileName = path.posix.basename(filePath.toLowerCase());
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart > 0 ? fileName.slice(extensionStart + 1) : "";
}
