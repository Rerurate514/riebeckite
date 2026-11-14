import type { ContentSource } from "@riebeckite/core";
import type { Content, Html, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";
import {
  getFileName,
  mergeEmbeddedFiles,
  readText,
} from "./excalidraw_files.js";
import {
  parseSize,
  renderSceneSvg,
  resolveMarkdownTarget,
} from "./excalidraw_scene.js";
import type { ExcalidrawSession } from "./excalidraw_shared.js";
import {
  isObsidianExcalidrawMarkdown,
  parseExcalidrawScene,
} from "./src/parse.js";
import { renderExcalidrawFigure } from "./src/render.js";

export function remarkExcalidrawMarkdownEmbed(input: {
  contentIndex: Map<string, string>;
  contentSource?: ContentSource;
  session: ExcalidrawSession;
  storeEmbed: (html: string) => string;
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

export async function replaceExcalidrawMarkdownEmbeds(
  replacement: { node: Text; index: number; parent: Parent },
  input: {
    contentIndex: Map<string, string>;
    contentSource?: ContentSource;
    session: ExcalidrawSession;
    storeEmbed: (html: string) => string;
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
          session: input.session,
        })
      : null;

    if (!html) continue;

    if (start > lastIndex) {
      nodes.push({
        type: "text",
        value: replacement.node.value.slice(lastIndex, start),
      });
    }
    const id = input.storeEmbed(html);
    nodes.push({
      type: "html",
      value: `<span data-excalidraw-embed="${id}"></span>`,
    } satisfies Html);
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

export async function renderExcalidrawMarkdownEmbed(input: {
  path: string;
  label: string;
  contentIndex: Map<string, string>;
  contentSource?: ContentSource;
  session: ExcalidrawSession;
}): Promise<string | null> {
  if (!input.contentSource) return null;
  const raw = await readText(input.contentSource, input.path);
  if (raw === null) return null;
  if (!isObsidianExcalidrawMarkdown(raw)) return null;

  try {
    const parsed = await parseExcalidrawScene(raw, input.path);
    const scene = await mergeEmbeddedFiles({
      scene: parsed.scene,
      embeddedFiles: parsed.embeddedFiles,
      contentSource: input.contentSource,
      contentIndex: input.contentIndex,
    });

    return renderExcalidrawFigure({
      title: getFileName(input.path),
      svg: await renderSceneSvg(input.session, scene),
      size: parseSize(input.label),
    });
  } catch (error) {
    console.error("[plugin-excalidraw] Failed to render Excalidraw embed", {
      path: input.path,
      error,
    });
    return renderExcalidrawFigure({
      title: getFileName(input.path),
      error: "Excalidraw could not be rendered.",
    });
  }
}
