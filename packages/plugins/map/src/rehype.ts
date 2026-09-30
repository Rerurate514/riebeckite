import {
  element,
  getStringProperty,
  getTextContent,
  hasClass,
  text,
  visitElements,
} from "./hast.js";
import { resolveMapOptions } from "./options.js";
import {
  describeMap,
  formatCoordinates,
  normalizeMapInput,
  openStreetMapUrl,
  parseMapSource,
} from "./parse.js";
import type {
  ElementNode,
  HastNode,
  MapData,
  MapMarker,
  MapOptions,
  MapPayload,
  ParentNode,
  ResolvedMapOptions,
} from "./types.js";

const DIAGNOSTIC_SOURCE = "@riebeckite/plugin-map";
const STATIC_IMAGE_WIDTH = 640;

/**
 * Replaces every fenced `map` code block with a map figure, and prepends a
 * figure for the configured frontmatter property when present.
 *
 * The figure carries the resolved map data in `data-rr-map-payload` and a
 * static fallback (coordinates, place, OpenStreetMap links) so the page is
 * usable without JavaScript. `initMap` upgrades each figure to an interactive
 * Leaflet map in the browser.
 */
export function rehypeMap(options: MapOptions = {}) {
  const resolved = resolveMapOptions(options);

  return (tree: HastNode, file: unknown) => {
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined) return;
      if (!isMapCodeBlock(node, resolved.language)) return;
      replaceMapBlock(parent, index, node, file, resolved);
    });

    const frontmatter = readFrontmatter(file);
    if (frontmatter) {
      const data = normalizeMapInput(frontmatter[resolved.frontmatterKey]);
      if (data) {
        const figure = buildFigure({
          data,
          options: resolved,
          caption: data.label ?? null,
        });
        getRootChildren(tree).unshift(figure);
      }
    }
  };
}

function replaceMapBlock(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: ResolvedMapOptions,
) {
  const code = findDirectChild(pre, "code");
  const source = code
    ? getTextContent(code).trim()
    : getTextContent(pre).trim();
  const data = parseMapSource(source);
  if (data === null) {
    reportDiagnostic(
      file,
      "Expected at least one coordinate or a `center` value.",
    );
    return;
  }

  const caption = extractCaption(pre, code) ?? data.label ?? null;
  parent.children = parent.children ?? [];
  parent.children[index] = buildFigure({
    data,
    options,
    caption,
    source,
  });
}

function buildFigure(input: {
  data: MapData;
  options: ResolvedMapOptions;
  caption: string | null;
  source?: string;
}): ElementNode {
  const { data, options } = input;
  const center = data.center ?? data.markers[0];
  if (!center) {
    // Should be unreachable: parse/normalize guarantee a center or a marker.
    return element("div", { className: options.className });
  }

  const tiles = data.tiles ?? options.tileUrl;
  const attribution = data.attribution ?? options.attribution;
  const image = resolveStaticImage(
    data.image ?? options.staticImageUrl,
    center,
    data.zoom ?? options.zoom,
    options.height,
  );
  const payload: MapPayload = {
    markers: data.markers,
    center,
    zoom: data.zoom ?? options.zoom,
    label: data.label ?? null,
    tiles,
    attribution,
    image,
  };

  const described = describeMap(data);
  const label = input.caption ?? (described || "Map");
  const labelId = `${options.className}-caption`;
  const children: HastNode[] = [];

  if (input.caption) {
    children.push(
      element(
        "figcaption",
        { id: labelId, className: `${options.className}__caption` },
        [text(input.caption)],
      ),
    );
  }

  children.push(
    element(
      "div",
      {
        className: `${options.className}__canvas`,
        dataRrMapCanvas: "true",
        style: `height:${options.height}px`,
        role: "application",
        ariaLabelledby: input.caption ? labelId : undefined,
        ariaLabel: input.caption ? undefined : label,
      },
      [],
    ),
  );

  if (options.staticFallback) {
    children.push(buildStatic(data, payload, options.className));
  }

  if (options.fallback && input.source) {
    children.push(
      element("details", { className: `${options.className}__fallback` }, [
        element("summary", {}, [text("Map source")]),
        element("pre", {}, [element("code", {}, [text(input.source)])]),
      ]),
    );
  }

  return element(
    "figure",
    {
      className: options.className,
      dataRrMap: "pending",
      dataRrMapPayload: JSON.stringify(payload),
      dataRrMapHeight: String(options.height),
    },
    children,
  );
}

function buildStatic(
  data: MapData,
  payload: MapPayload,
  base: string,
): ElementNode {
  const children: HastNode[] = [];

  if (payload.image) {
    children.push(
      element("img", {
        className: `${base}__image`,
        src: payload.image,
        alt: describeMap(data) || "Map",
        loading: "lazy",
        decoding: "async",
      }),
    );
  }

  if (payload.label) {
    children.push(
      element("p", { className: `${base}__place` }, [text(payload.label)]),
    );
  }

  const markers =
    payload.markers.length > 0 ? payload.markers : [payload.center];
  children.push(
    element(
      "ul",
      { className: `${base}__markers` },
      markers.map((marker) => buildMarker(marker, payload.zoom, base)),
    ),
  );

  const attribution = stripHtml(payload.attribution);
  if (attribution) {
    children.push(
      element("p", { className: `${base}__attribution` }, [text(attribution)]),
    );
  }

  return element(
    "div",
    { className: `${base}__static`, dataRrMapStatic: "true" },
    children,
  );
}

function buildMarker(
  marker: MapMarker,
  zoom: number,
  base: string,
): ElementNode {
  const coordinates = formatCoordinates(marker);
  const label = marker.label ? `${marker.label} · ${coordinates}` : coordinates;
  const children: HastNode[] = [
    element(
      "a",
      {
        className: `${base}__link`,
        href: openStreetMapUrl(marker, zoom),
        target: "_blank",
        rel: "noopener noreferrer",
      },
      [text(label)],
    ),
  ];
  if (marker.description) {
    children.push(
      element("span", { className: `${base}__description` }, [
        text(` — ${marker.description}`),
      ]),
    );
  }
  return element("li", { className: `${base}__marker` }, children);
}

function resolveStaticImage(
  template: string | null,
  center: { lat: number; lng: number },
  zoom: number,
  height: number,
): string | null {
  if (!template) return null;
  return template
    .replaceAll("{lat}", String(center.lat))
    .replaceAll("{lng}", String(center.lng))
    .replaceAll("{zoom}", String(zoom))
    .replaceAll("{width}", String(STATIC_IMAGE_WIDTH))
    .replaceAll("{height}", String(height));
}

function extractCaption(
  pre: ElementNode,
  code: ElementNode | null,
): string | null {
  const title =
    getStringProperty(pre, "title") ??
    (code ? getStringProperty(code, "title") : null);
  return title?.trim() || null;
}

function isMapCodeBlock(node: ElementNode, language: string): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(code && hasClass(code, `language-${language}`));
}

function findDirectChild(
  node: ElementNode,
  tagName: string,
): ElementNode | null {
  return (
    node.children?.find(
      (child): child is ElementNode =>
        child.type === "element" && child.tagName === tagName,
    ) ?? null
  );
}

function readFrontmatter(file: unknown): Record<string, unknown> | null {
  const matter = (file as { data?: { matter?: unknown } } | undefined)?.data
    ?.matter;
  if (typeof matter !== "object" || matter === null || Array.isArray(matter)) {
    return null;
  }
  return matter as Record<string, unknown>;
}

function getRootChildren(tree: HastNode): HastNode[] {
  const children = (tree as { children?: unknown }).children;
  if (!Array.isArray(children)) {
    (tree as { children?: HastNode[] }).children = [];
    return (tree as { children: HastNode[] }).children;
  }
  return children as HastNode[];
}

function reportDiagnostic(file: unknown, message: string) {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, `Invalid map source: ${message}`);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: DIAGNOSTIC_SOURCE,
      ruleId: "invalid-source",
    });
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&copy;/gi, "\u00a9")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
