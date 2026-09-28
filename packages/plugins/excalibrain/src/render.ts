import { EXCALIBRAIN_REGION_ORDER } from "./layout.js";
import type {
  ExcaliBrainGraph,
  ExcaliBrainLayout,
  ExcaliBrainLink,
  ExcaliBrainNodeRole,
  ExcaliBrainOptions,
  ExcaliBrainPositionedNode,
  ExcaliBrainRenderMode,
} from "./types.js";

const ROLE_ATTRIBUTE: Record<ExcaliBrainNodeRole, string> = {
  parent: "parent",
  child: "child",
  leftFriend: "left-friend",
  rightFriend: "right-friend",
  previous: "previous",
  next: "next",
  sibling: "sibling",
  center: "center",
};

export type ExcaliBrainSectionInput = {
  graph: ExcaliBrainGraph;
  layout: ExcaliBrainLayout;
  options?: ExcaliBrainOptions;
  render?: ExcaliBrainRenderMode;
};

/** Render the map as a standalone SVG string. Shared by build and client. */
export function renderExcaliBrainSvg(
  graph: ExcaliBrainGraph,
  layout: ExcaliBrainLayout,
  options: ExcaliBrainOptions = {},
): string {
  const className = options.className ?? "rb-excalibrain";
  const byId = new Map(layout.nodes.map((node) => [node.id, node] as const));
  const parts: string[] = [];

  parts.push(
    `<svg class="${className}__svg" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeAttribute(`${graph.center.title} ExcaliBrain`)}" xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">`,
  );

  const links = layout.links
    .map((link) => renderLink(link, byId, className))
    .join("");
  parts.push(`<g class="${className}__links">${links}</g>`);

  for (const region of EXCALIBRAIN_REGION_ORDER) {
    const regionNodes = layout.nodes.filter((node) => node.region === region);
    if (regionNodes.length === 0) continue;
    const nodes = regionNodes
      .map((node) => renderNode(node, className))
      .join("");
    parts.push(
      `<g class="${className}__region" data-region="${region}">${nodes}</g>`,
    );
  }

  const center = layout.nodes.find((node) => node.role === "center");
  if (center) parts.push(renderNode(center, className));

  parts.push("</svg>");
  return parts.join("");
}

/** Render the `<section>` wrapper, with inline SVG and/or a client canvas. */
export function renderExcaliBrainSection(
  input: ExcaliBrainSectionInput,
): string {
  const options = input.options ?? {};
  const renderMode = input.render ?? "build";
  const className = options.className ?? "rb-excalibrain";
  const heading = options.heading !== false;
  const headingText = options.headingText ?? "ExcaliBrain";
  const centerSlug = input.graph.center.slug ?? input.graph.center.id;

  const renderAtBuild = renderMode === "build" || renderMode === "both";
  const renderAtClient = renderMode === "client" || renderMode === "both";

  const svg = renderAtBuild
    ? renderExcaliBrainSvg(input.graph, input.layout, options)
    : "";
  const payload = renderAtClient
    ? ` data-excalibrain-payload="${escapeAttribute(
        JSON.stringify({
          graph: input.graph,
          layout: input.layout,
          className,
        }),
      )}"`
    : "";

  return [
    `<section class="${className}" data-excalibrain data-excalibrain-render="${renderMode}" data-excalibrain-center="${escapeAttribute(centerSlug)}">`,
    heading
      ? `<h2 class="${className}__heading">${escapeHtml(headingText)}</h2>`
      : "",
    `<div class="${className}__canvas"${payload}>${svg}</div>`,
    "</section>",
  ].join("");
}

function renderNode(node: ExcaliBrainPositionedNode, className: string): string {
  const box = `<rect class="${className}__node-box" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="4" />`;
  const label = `<text class="${className}__node-label" x="${round(
    node.x + node.width / 2,
  )}" y="${round(node.y + node.height / 2)}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(node.title)}</text>`;
  const inner = `${box}${label}`;
  const content = node.permalink
    ? `<a class="${className}__node-link" href="${escapeAttribute(node.permalink)}">${inner}</a>`
    : inner;

  const attributes = [
    `class="${className}__node"`,
    `data-node-role="${ROLE_ATTRIBUTE[node.role]}"`,
    `data-node-slug="${escapeAttribute(node.slug ?? node.title)}"`,
    node.virtual ? 'data-node-virtual="true"' : "",
    `data-relation-type="${node.relationType}"`,
  ].filter(Boolean);

  return `<g ${attributes.join(" ")}>${content}</g>`;
}

function renderLink(
  link: ExcaliBrainLink,
  byId: Map<string, ExcaliBrainPositionedNode>,
  className: string,
): string {
  const from = byId.get(link.from);
  const to = byId.get(link.to);
  if (!from || !to) return "";

  const d = `M ${round(from.x + from.width / 2)} ${round(from.y + from.height / 2)} L ${round(to.x + to.width / 2)} ${round(to.y + to.height / 2)}`;
  return `<path class="${className}__link" data-link-role="${ROLE_ATTRIBUTE[link.role]}" data-relation-type="${link.relationType}" d="${d}" />`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
