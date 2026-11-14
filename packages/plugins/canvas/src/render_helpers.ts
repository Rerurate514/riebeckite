import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type {
  CanvasDocument,
  CanvasLayoutNode,
  CanvasNode,
  CanvasResolver,
  ResolvedCanvasOptions,
} from "./types.js";

export const CANVAS_NOTE_HREF = "#riebeckite-canvas-note";

export const WIKILINK_PATTERN =
  /(!?)\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

export type RenderCanvasInput = {
  document: CanvasDocument;
  source: string;
  options: ResolvedCanvasOptions;
  resolver: CanvasResolver;
};

export function renderCanvasPage(input: {
  title: string;
  canvas: string;
}): string {
  const heading = input.title
    ? `<h1 class="rb-canvas-page__title">${escapeHtml(input.title)}</h1>`
    : "";
  return `<main class="rb-canvas-page">${heading}${input.canvas}</main>`;
}

export function renderAssetPreview(url: string, label: string): string {
  const safeUrl = escapeHtmlAttribute(url);
  const extension = url.split("?")[0]?.split(".").at(-1)?.toLowerCase();
  if (
    ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(
      extension ?? "",
    )
  ) {
    return `<a class="rb-canvas__asset" href="${safeUrl}"><img src="${safeUrl}" alt="${escapeHtmlAttribute(label)}" loading="lazy" /></a>`;
  }
  if (extension === "pdf")
    return `<a class="rb-canvas__node-link" href="${safeUrl}">${escapeHtml(label)}</a>`;
  if (["mp3", "wav", "ogg", "m4a"].includes(extension ?? ""))
    return `<audio controls src="${safeUrl}"></audio>`;
  if (["mp4", "webm", "mov"].includes(extension ?? ""))
    return `<video controls preload="metadata" src="${safeUrl}"></video>`;
  return `<a class="rb-canvas__node-link" href="${safeUrl}">${escapeHtml(label)}</a>`;
}

export function renderGroupBackground(
  background: string,
  style: CanvasNode["backgroundStyle"],
  resolver: CanvasResolver,
): string {
  const link = resolver.resolveFile(background);
  if (link.kind !== "asset") return "";
  const mode = style === "repeat" ? "repeat" : "no-repeat";
  const size =
    style === "cover" ? "cover" : style === "ratio" ? "contain" : "auto";
  return ` data-canvas-background="${escapeHtmlAttribute(link.url)}" data-canvas-background-repeat="${mode}" data-canvas-background-size="${size}"`;
}

export function renderNodeStyle(
  node: CanvasLayoutNode,
  background: string,
): string {
  const declarations = [
    `left:${node.x}px`,
    `top:${node.y}px`,
    `width:${node.width}px`,
    `height:${node.height}px`,
    `z-index:${node.zIndex}`,
  ];
  if (node.color && /^#[0-9a-f]{6}$/i.test(node.color))
    declarations.push(`--rb-canvas-node-color:${node.color}`);
  if (background) {
    const image = background.match(/data-canvas-background="([^"]*)"/)?.[1];
    const repeat = background.match(
      /data-canvas-background-repeat="([^"]*)"/,
    )?.[1];
    const size = background.match(/data-canvas-background-size="([^"]*)"/)?.[1];
    if (image) declarations.push(`background-image:url(&quot;${image}&quot;)`);
    if (repeat) declarations.push(`background-repeat:${repeat}`);
    if (size) declarations.push(`background-size:${size}`);
  }
  return declarations.join(";");
}
