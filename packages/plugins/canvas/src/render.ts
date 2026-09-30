import {
  escapeHtml,
  escapeHtmlAttribute,
  escapeScriptJson,
} from "@riebeckite/core";
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

export function renderCanvas(input: RenderCanvasInput): string {
  const { document, source, options, resolver } = input;
  const layout = buildCanvasLayout({
    nodes: limitNodes(document.nodes, options.maxNodes),
    edges: document.edges,
  });

  const parts: string[] = [];
  if (options.render === "static" || options.render === "both") {
    const staticHtml = renderStatic(layout, resolver);
    if (staticHtml) parts.push(staticHtml);
  }
  if (options.render === "client" || options.render === "both") {
    parts.push('<div class="rb-canvas__stage" data-canvas-stage></div>');
  }
  parts.push(renderFallback(document));
  parts.push(renderPayload(document));

  const style = renderHeightStyle(options.height);
  const maxNodes =
    options.maxNodes === undefined
      ? ""
      : ` data-canvas-max-nodes="${options.maxNodes}"`;
  return `<div class="${escapeHtmlAttribute(options.className)}" data-canvas="${escapeHtmlAttribute(source)}" data-canvas-nodes="${document.nodes.length}" data-canvas-edges="${document.edges.length}" data-canvas-render="${options.render}"${maxNodes}${style}>${parts.join("\n")}</div>`;
}

function renderStatic(layout: CanvasLayout, resolver: CanvasResolver): string {
  if (layout.nodes.length === 0) return "";
  const edges = renderEdges(layout);
  const cards = layout.nodes
    .map((node) => renderNodeCard(node, resolver))
    .join("\n");
  return `<div class="rb-canvas__static" role="img" aria-label="Canvas" style="position:relative;width:${layout.width}px;height:${layout.height}px">${edges}${cards}</div>`;
}

function renderEdges(layout: CanvasLayout): string {
  if (layout.edges.length === 0) return "";
  const lines = layout.edges.map(renderEdgeLine).join("");
  return `<svg class="rb-canvas__edges" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true">${lines}</svg>`;
}

function renderEdgeLine(
  edge: CanvasEdge & { x1: number; y1: number; x2: number; y2: number },
): string {
  return `<line class="rb-canvas__edge" x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}"></line>`;
}

function renderNodeCard(
  node: CanvasLayoutNode,
  resolver: CanvasResolver,
): string {
  const color = node.color
    ? ` data-canvas-color="${escapeHtmlAttribute(node.color)}"`
    : "";
  return `<div class="rb-canvas__node rb-canvas__node--${node.type}" data-canvas-node-id="${escapeHtmlAttribute(node.id)}"${color} style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px">${renderNodeBody(node, resolver)}</div>`;
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
    return `<a class="rb-canvas__node-link" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
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
    return `<a class="rb-canvas__node-link" href="${escapeHtmlAttribute(link.url)}">${escapeHtml(label)}</a>`;
  }
  return `<span class="rb-canvas__node-label">${escapeHtml(label)}</span>`;
}

function renderText(value: string, resolver: CanvasResolver): string {
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

  return output.join("").replace(/\n/g, "<br />");
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

function renderPayload(document: CanvasDocument): string {
  return `<script type="application/json" data-canvas-payload>${escapeScriptJson(JSON.stringify(document))}</script>`;
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
