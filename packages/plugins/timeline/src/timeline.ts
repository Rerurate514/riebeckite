import {
  type ContentManifestEntry,
  escapeHtml,
  escapeHtmlAttribute,
  normalizeTag,
} from "@riebeckite/core";
import type {
  ResolvedTimelineOptions,
  ResolvedTimelineSelector,
  TimelineEntry,
  TimelineOptions,
} from "./types.js";

export const DEFAULT_TIMELINE_BASE_PATH = "/timeline";
export const DEFAULT_TIMELINE_CLASS_NAME = "rb-timeline";
export const DEFAULT_TIMELINE_KEY = "timeline";

export function resolveTimelineOptions(
  options: TimelineOptions = {},
): ResolvedTimelineOptions {
  return {
    basePath: normalizeBasePath(options.basePath ?? DEFAULT_TIMELINE_BASE_PATH),
    className: options.className?.trim() || DEFAULT_TIMELINE_CLASS_NAME,
    key: options.key?.trim() || DEFAULT_TIMELINE_KEY,
    title: options.title?.trim() || "Timeline",
    include: resolveSelector(options.include),
    exclude: resolveSelector(options.exclude),
    selection: options.selection === "marked" ? "marked" : "automatic",
  };
}

export function buildTimeline(
  entries: readonly ContentManifestEntry[],
  options: ResolvedTimelineOptions,
  contentIndex: ReadonlyMap<string, string> = new Map(),
): TimelineEntry[] {
  return entries
    .filter((entry) => selectTimelineEntry(entry, options, contentIndex))
    .flatMap((entry) => {
      const date = timelineDate(entry);
      return date
        ? [{ date, permalink: entry.permalink, title: entry.title }]
        : [];
    })
    .toSorted(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.title.localeCompare(right.title),
    );
}

export function selectTimelineEntry(
  entry: ContentManifestEntry,
  options: ResolvedTimelineOptions,
  contentIndex: ReadonlyMap<string, string> = new Map(),
): boolean {
  if (timelineDate(entry) === null) return false;
  if (matchesSelector(entry, options.exclude, contentIndex)) return false;

  const marker = entry.frontmatter[options.key];
  if (marker === false) return false;
  if (marker === true) return true;
  if (options.selection === "marked") return false;
  return options.include
    ? matchesSelector(entry, options.include, contentIndex)
    : true;
}

export function renderTimelinePage(
  entries: readonly TimelineEntry[],
  options: ResolvedTimelineOptions,
) {
  const className = escapeHtmlAttribute(options.className);
  const rootClassName = `${DEFAULT_TIMELINE_CLASS_NAME} ${className}`;
  const items = entries
    .map(
      (entry) =>
        `<li class="${DEFAULT_TIMELINE_CLASS_NAME}__item"><time class="${DEFAULT_TIMELINE_CLASS_NAME}__date" datetime="${escapeHtmlAttribute(entry.date)}">${escapeHtml(entry.date)}</time><a class="${DEFAULT_TIMELINE_CLASS_NAME}__link" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");
  return {
    title: options.title,
    html: `<section class="${rootClassName}" data-rr-timeline><h1 class="${DEFAULT_TIMELINE_CLASS_NAME}__title">${escapeHtml(options.title)}</h1><ol class="${DEFAULT_TIMELINE_CLASS_NAME}__list">${items}</ol></section>`,
  };
}

function timelineDate(entry: ContentManifestEntry): string | null {
  for (const key of ["date", "published", "created"] as const) {
    const value = entry.frontmatter[key];
    const date =
      value instanceof Date
        ? value
        : typeof value === "string"
          ? new Date(value)
          : null;
    if (date && !Number.isNaN(date.getTime()))
      return date.toISOString().slice(0, 10);
  }
  return null;
}

function resolveSelector(
  selector: TimelineOptions["include"],
): ResolvedTimelineSelector | undefined {
  if (!selector) return undefined;
  return {
    folders: (Array.isArray(selector.folders) ? selector.folders : [])
      .filter((folder): folder is string => typeof folder === "string")
      .map(normalizeFolder)
      .filter(Boolean),
    tags: (Array.isArray(selector.tags) ? selector.tags : [])
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => normalizeTag(tag.replace(/^#/, "")))
      .filter((tag): tag is string => tag !== null),
  };
}

function matchesSelector(
  entry: ContentManifestEntry,
  selector: ResolvedTimelineSelector | undefined,
  contentIndex: ReadonlyMap<string, string>,
): boolean {
  if (!selector) return false;
  const folder = contentFolder(entry, contentIndex);
  return (
    selector.folders.some(
      (candidate) => folder === candidate || folder.startsWith(`${candidate}/`),
    ) || selector.tags.some((tag) => entry.tags.includes(tag))
  );
}

function contentFolder(
  entry: ContentManifestEntry,
  contentIndex: ReadonlyMap<string, string>,
): string {
  const source =
    contentIndex.get(entry.slug.toLowerCase()) ??
    contentIndex.get(entry.slug) ??
    entry.slug;
  const normalized = normalizeFolder(source);
  const separator = normalized.lastIndexOf("/");
  return separator === -1 ? "" : normalized.slice(0, separator);
}

function normalizeFolder(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed === "") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
