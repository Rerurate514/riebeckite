import {
  type ContentManifestEntry,
  escapeHtml,
  escapeHtmlAttribute,
} from "@riebeckite/core";
import type {
  ResolvedTimelineOptions,
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
  };
}

export function buildTimeline(
  entries: readonly ContentManifestEntry[],
  options: ResolvedTimelineOptions,
): TimelineEntry[] {
  return entries
    .filter((entry) => entry.frontmatter[options.key] === true)
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

export function renderTimelinePage(
  entries: readonly TimelineEntry[],
  options: ResolvedTimelineOptions,
) {
  const className = escapeHtmlAttribute(options.className);
  const items = entries
    .map(
      (entry) =>
        `<li class="${className}__item"><time class="${className}__date" datetime="${escapeHtmlAttribute(entry.date)}">${escapeHtml(entry.date)}</time><a class="${className}__link" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");
  return {
    title: options.title,
    html: `<section class="${className}" data-rr-timeline><h1 class="${className}__title">${escapeHtml(options.title)}</h1><ol class="${className}__list">${items}</ol></section>`,
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

function normalizeBasePath(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed === "") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
