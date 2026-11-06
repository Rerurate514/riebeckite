import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import { buildCanvasLayout } from "./parse.js";
import type {
  CanvasDocument,
  CanvasEdge,
  CanvasFileLink,
  CanvasLayout,
  CanvasLayoutNode,
  CanvasNode,
  CanvasResolver,
  ResolvedCanvasOptions,
} from "./types.js";

export const CANVAS_NOTE_HREF = "#riebeckite-canvas-note";

const WIKILINK_PATTERN = /(!?)\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

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

export function renderCanvas(input: RenderCanvasInput): string {
  const { document, source, options, resolver } = input;
  const layout = buildCanvasLayout({
    nodes: limitNodes(document.nodes, options.maxNodes),
    edges: document.edges,
  });

  const parts: string[] = [];
  const staticHtml = renderStatic(layout, resolver);
  if (staticHtml) parts.push(staticHtml);
  if (options.render === "client" || options.render === "both") {
    parts.push('<div class="rb-canvas__stage" data-canvas-stage></div>');
  }
  parts.push(renderFallback(document));
  const style = renderHeightStyle(options.height);
  const payload = escapeHtmlAttribute(JSON.stringify(document));
  const maxNodes =
    options.maxNodes === undefined
      ? ""
      : ` data-canvas-max-nodes="${options.maxNodes}"`;
  return `<div class="${escapeHtmlAttribute(options.className)}" data-canvas="${escapeHtmlAttribute(source)}" data-canvas-payload="${payload}" data-canvas-nodes="${document.nodes.length}" data-canvas-edges="${document.edges.length}" data-canvas-render="${options.render}"${maxNodes}${style}><div class="rb-canvas__frame">${parts.join("\n")}</div></div>`;
}

function renderStatic(layout: CanvasLayout, resolver: CanvasResolver): string {
  if (layout.nodes.length === 0) {
    return '<div class="rb-canvas__static rb-canvas__empty">This canvas has no nodes.</div>';
  }
  const edges = renderEdges(layout);
  const cards = layout.nodes
    .map((node) => renderNodeCard(node, resolver))
    .join("\n");
  return `<div class="rb-canvas__static" data-canvas-static><div class="rb-canvas__world" data-canvas-world role="img" aria-label="Canvas" style="width:${layout.width}px;height:${layout.height}px">${edges}${cards}</div></div>`;
}

function renderEdges(layout: CanvasLayout): string {
  if (layout.edges.length === 0) return "";
  const lines = layout.edges.map(renderEdgeLine).join("");
  return `<svg class="rb-canvas__edges" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true"><defs><marker id="rb-canvas-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" class="rb-canvas__arrow"></path></marker></defs>${lines}</svg>`;
}

function renderEdgeLine(
  edge: CanvasEdge & { x1: number; y1: number; x2: number; y2: number },
): string {
  const fromEnd =
    edge.fromEnd === "arrow" ? ' marker-start="url(#rb-canvas-arrow)"' : "";
  const toEnd =
    edge.toEnd === "arrow" ? ' marker-end="url(#rb-canvas-arrow)"' : "";
  const color = renderColorAttribute(edge.color, "data-canvas-edge-color");
  const label = edge.label
    ? `<text class="rb-canvas__edge-label" x="${(edge.x1 + edge.x2) / 2}" y="${(edge.y1 + edge.y2) / 2}">${escapeHtml(edge.label)}</text>`
    : "";
  return `<line class="rb-canvas__edge" x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}"${color}${fromEnd}${toEnd}></line>${label}`;
}

function renderNodeCard(
  node: CanvasLayoutNode,
  resolver: CanvasResolver,
): string {
  const color = renderColorAttribute(node.color, "data-canvas-color");
  const background =
    node.type === "group" && node.background
      ? renderGroupBackground(node.background, node.backgroundStyle, resolver)
      : "";
  return `<div class="rb-canvas__node rb-canvas__node--${node.type}" data-canvas-node-id="${escapeHtmlAttribute(node.id)}"${color}${background} style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px">${renderNodeBody(node, resolver)}</div>`;
}

function renderNodeBody(node: CanvasNode, resolver: CanvasResolver): string {
  if (node.type === "group") {
    return `<div class="rb-canvas__node-label">${escapeHtml(node.label ?? "Group")}</div>`;
  }
  if (node.type === "text") {
    return `<div class="rb-canvas__node-text">${renderText(node.text ?? "", resolver)}</div>`;
  }
  if (node.type === "link") {
    const label = node.label ?? node.url ?? "Link";
    const href = escapeHtmlAttribute(node.url ?? "#");
    return isSafeExternalUrl(node.url)
      ? `<a class="rb-canvas__node-link" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}<span class="rb-canvas__node-url">${escapeHtml(node.url ?? "")}</span></a>`
      : `<span class="rb-canvas__node-label">${escapeHtml(label)}</span>`;
  }
  return renderFileBody(node, resolver);
}

function renderFileBody(node: CanvasNode, resolver: CanvasResolver): string {
  const target = node.file ?? node.label ?? "File";
  const label = node.label ?? getFileName(target);
  const link: CanvasFileLink = node.file
    ? resolver.resolveFile(node.file)
    : { kind: "unresolved", label };

  if (link.kind === "note") {
    return renderNoteAnchor(link.slug, label, "rb-canvas__node-link");
  }
  if (link.kind === "asset") {
    return renderAssetPreview(link.url, label);
  }
  return `<span class="rb-canvas__node-label">${escapeHtml(label)}</span>`;
}

function renderText(value: string, resolver: CanvasResolver): string {
  const blocks = value
    .split(/\n{2,}/)
    .map((block) => renderTextBlock(block, resolver));
  return blocks.join("");
}

function renderTextBlock(value: string, resolver: CanvasResolver): string {
  const lines = value.split("\n");
  if (lines.length === 1 && /^#{1,6}\s+/.test(value)) {
    const level = value.match(/^#+/)?.[0].length ?? 1;
    return `<h${level}>${renderInline(value.replace(/^#{1,6}\s+/, ""), resolver)}</h${level}>`;
  }
  if (lines.every((line) => /^[-*+]\s+/.test(line))) {
    return `<ul>${lines.map((line) => `<li>${renderInline(line.replace(/^[-*+]\s+/, ""), resolver)}</li>`).join("")}</ul>`;
  }
  if (lines.every((line) => /^>\s?/.test(line))) {
    return `<blockquote>${lines.map((line) => renderInline(line.replace(/^>\s?/, ""), resolver)).join("<br />")}</blockquote>`;
  }
  return `<p>${lines.map((line) => renderInline(line, resolver)).join("<br />")}</p>`;
}

function renderInline(value: string, resolver: CanvasResolver): string {
  const output: string[] = [];
  let lastIndex = 0;

  WIKILINK_PATTERN.lastIndex = 0;
  for (
    let match = WIKILINK_PATTERN.exec(value);
    match !== null;
    match = WIKILINK_PATTERN.exec(value)
  ) {
    if (match.index > lastIndex) {
      output.push(escapeHtml(value.slice(lastIndex, match.index)));
    }
    const target = match[2]?.trim() ?? "";
    const label = match[3]?.trim() || target;
    const resolved = target ? resolver.resolveWikilink(target) : null;
    output.push(
      resolved ? renderNoteAnchor(resolved.slug, label) : escapeHtml(label),
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < value.length) output.push(escapeHtml(value.slice(lastIndex)));

  return output
    .join("")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderAssetPreview(url: string, label: string): string {
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

function renderGroupBackground(
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

function renderColorAttribute(color: string | undefined, name: string): string {
  if (!color) return "";
  if (/^[1-6]$/.test(color) || /^#[0-9a-fA-F]{6}$/.test(color)) {
    return ` ${name}="${escapeHtmlAttribute(color)}"`;
  }
  return "";
}

function isSafeExternalUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function renderNoteAnchor(
  slug: string,
  label: string,
  extraClass?: string,
): string {
  const className = extraClass
    ? `rb-canvas__link ${extraClass}`
    : "rb-canvas__link";
  return `<a class="${className}" href="${CANVAS_NOTE_HREF}" data-canvas-note="${escapeHtmlAttribute(encodeURIComponent(slug))}">${escapeHtml(label)}</a>`;
}

function renderFallback(document: CanvasDocument): string {
  const nodes = document.nodes
    .map(
      (node) =>
        `<li class="rb-canvas__fallback-item"><span class="rb-canvas__fallback-kind">${escapeHtml(node.type)}</span> <code>${escapeHtml(node.id)}</code>${describeNode(node)}</li>`,
    )
    .join("\n");
  const edges = document.edges
    .map(
      (edge) =>
        `<li class="rb-canvas__fallback-item"><span class="rb-canvas__fallback-kind">edge</span> <code>${escapeHtml(edge.fromNode)}</code> \u2192 <code>${escapeHtml(edge.toNode)}</code>${edge.label ? ` \u2014 ${escapeHtml(edge.label)}` : ""}</li>`,
    )
    .join("\n");
  return `<details class="rb-canvas__fallback"><summary>Canvas nodes and edges</summary><ul class="rb-canvas__fallback-list">${nodes}${edges}</ul></details>`;
}

function describeNode(node: CanvasNode): string {
  const parts: string[] = [];
  if (node.text) parts.push(excerpt(node.text));
  if (node.file) parts.push(escapeHtml(node.file));
  if (node.url) parts.push(escapeHtml(node.url));
  if (node.label) parts.push(escapeHtml(node.label));
  return parts.length > 0 ? ` \u2014 ${parts.join(" / ")}` : "";
}

function renderHeightStyle(height: number | string | undefined): string {
  const length = cssLength(height);
  return length
    ? ` style="--rb-canvas-height:${escapeHtmlAttribute(length)}"`
    : "";
}

function cssLength(value: number | string | undefined): string | null {
  if (value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? `${value}px` : null;
  }
  return value.trim() || null;
}

function limitNodes(
  nodes: readonly CanvasNode[],
  maxNodes?: number,
): CanvasNode[] {
  if (maxNodes === undefined || maxNodes <= 0) return [...nodes];
  return nodes.slice(0, maxNodes);
}

function getFileName(contentPath: string): string {
  return contentPath.split("/").at(-1) ?? contentPath;
}

function excerpt(value: string): string {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return escapeHtml(
    singleLine.length > 80 ? `${singleLine.slice(0, 79)}\u2026` : singleLine,
  );
}
