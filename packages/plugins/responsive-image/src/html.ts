import { escapeHtmlAttribute } from "@riebeckite/core";
import type { ResponsiveImageOptions } from "./options.js";
import {
  type ResolvedResponsiveImageOptions,
  resolveResponsiveImageOptions,
} from "./options.js";
import { buildResponsiveSrcset } from "./srcset.js";
import { RESPONSIVE_IMAGE_MARKER } from "./rehype.js";

const IMG_TAG_PATTERN = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const ATTRIBUTE_PATTERN =
  /([^\s"'=<>`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

type OutputAttribute = {
  name: string;
  value: string | null;
  escaped: boolean;
};

/**
 * Manifest pass: replace marked `<img>` elements with a `<picture>` element
 * built from sibling variants that already exist in the content manifest.
 *
 * This is the "dual mutation" step used by the query plugin: the manifest
 * entry HTML and the cached `PostContent.html` must stay in sync.
 */
export function applyResponsiveImages(
  html: string,
  knownPaths: Iterable<string>,
  options: ResponsiveImageOptions = {},
): string {
  if (!html.includes(RESPONSIVE_IMAGE_MARKER)) return html;

  return html.replace(IMG_TAG_PATTERN, (tag) =>
    transformImgTag(tag, knownPaths, options),
  );
}

function transformImgTag(
  tag: string,
  knownPaths: Iterable<string>,
  options: ResponsiveImageOptions,
): string {
  const inner = tag.slice("<img".length, tag.length - 1);
  const attributes = parseAttributes(inner);
  if (!hasMarker(attributes)) return tag;

  const src = findAttribute(attributes, "src")?.value ?? null;
  if (!src || src.trim() === "") return tag;

  const plan = buildResponsiveSrcset(knownPaths, src, options);
  if (!plan.hasVariants) return tag;

  const resolved = resolveResponsiveImageOptions(options);
  const baseAttributes = attributes.filter(
    (attribute) =>
      attribute.name.toLowerCase() !== RESPONSIVE_IMAGE_MARKER,
  );
  const imageAttributes = normalizeImageAttributes(baseAttributes, resolved);
  if (plan.imgSrcset) {
    setAttribute(imageAttributes, "srcset", plan.imgSrcset);
  }

  const sources = plan.sources
    .map(
      (source) =>
        `<source type="${escapeHtmlAttribute(source.type)}" srcset="${escapeHtmlAttribute(source.srcset)}" />`,
    )
    .join("");
  const image = `<img ${serializeAttributes(imageAttributes)} />`;

  return `<picture class="${escapeHtmlAttribute(resolved.className)}">${sources}${image}</picture>`;
}

function normalizeImageAttributes(
  attributes: OutputAttribute[],
  resolved: ResolvedResponsiveImageOptions,
): OutputAttribute[] {
  const result = [...attributes];
  if (resolved.lazy) ensureAttribute(result, "loading", "lazy");
  if (resolved.decoding) ensureAttribute(result, "decoding", "async");
  ensureAttribute(result, "sizes", resolved.sizes);
  return result;
}

function ensureAttribute(
  attributes: OutputAttribute[],
  name: string,
  value: string,
): void {
  if (findAttribute(attributes, name)) return;
  attributes.push({ name, value, escaped: true });
}

function setAttribute(
  attributes: OutputAttribute[],
  name: string,
  value: string,
): void {
  const existing = findAttribute(attributes, name);
  if (existing) {
    existing.value = value;
    existing.escaped = true;
    return;
  }
  attributes.push({ name, value, escaped: true });
}

function findAttribute(
  attributes: readonly OutputAttribute[],
  name: string,
): OutputAttribute | undefined {
  const target = name.toLowerCase();
  return attributes.find(
    (attribute) => attribute.name.toLowerCase() === target,
  );
}

function hasMarker(attributes: readonly OutputAttribute[]): boolean {
  return findAttribute(attributes, RESPONSIVE_IMAGE_MARKER) !== undefined;
}

function parseAttributes(source: string): OutputAttribute[] {
  const attributes: OutputAttribute[] = [];
  ATTRIBUTE_PATTERN.lastIndex = 0;

  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    attributes.push({
      name: match[1],
      value: match[2] ?? match[3] ?? match[4] ?? null,
      escaped: false,
    });
  }

  return attributes;
}

function serializeAttributes(attributes: readonly OutputAttribute[]): string {
  return attributes
    .map((attribute) => serializeAttribute(attribute))
    .join(" ");
}

function serializeAttribute(attribute: OutputAttribute): string {
  if (attribute.value === null) return attribute.name;
  const value = attribute.escaped
    ? attribute.value
    : attribute.value.replace(/"/g, "&quot;");
  return `${attribute.name}="${value}"`;
}
