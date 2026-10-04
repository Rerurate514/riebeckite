import {
  type ContentManifest,
  type ContentManifestEntry,
  type Diagnostic,
  escapeHtml,
  escapeHtmlAttribute,
} from "@riebeckite/core";
import type {
  ResolvedSeriesOptions,
  SeriesIndex,
  SeriesMember,
  SeriesOptions,
} from "./types.js";

/** Base class applied when `options.className` is not set. */
export const DEFAULT_SERIES_CLASS_NAME = "rb-series";
export const DEFAULT_SERIES_BASE_PATH = "/series";

/** Applies defaults to the user-supplied options. */
export function resolveSeriesOptions(
  options: SeriesOptions = {},
): ResolvedSeriesOptions {
  return {
    key: options.key ?? "series",
    orderKey: options.orderKey ?? "series_order",
    titleKey: options.titleKey ?? "series_title",
    heading: options.heading ?? true,
    className: options.className ?? DEFAULT_SERIES_CLASS_NAME,
    positionLabel: options.positionLabel ?? false,
    basePath: normalizeBasePath(options.basePath ?? DEFAULT_SERIES_BASE_PATH),
  };
}

/**
 * Groups every manifest entry that declares a series and returns one
 * `SeriesIndex` per series, in first-seen order. Members are sorted by
 * `orderKey`, then the `date`/`created`/`published` frontmatter value, then
 * `title`, then `slug`, so ties resolve deterministically.
 */
export function collectSeriesIndexes(
  manifest: ContentManifest,
  options: SeriesOptions = {},
): SeriesIndex[] {
  const resolved = resolveSeriesOptions(options);
  const groups = new Map<string, ContentManifestEntry[]>();
  const titles = new Map<string, string>();

  for (const entry of manifest.entries) {
    const name = readSeriesName(entry, resolved.key);
    if (!name) continue;

    const group = groups.get(name);
    if (group) group.push(entry);
    else groups.set(name, [entry]);

    if (!titles.has(name)) {
      const title = readString(entry, resolved.titleKey);
      if (title) titles.set(name, title);
    }
  }

  const indexes: SeriesIndex[] = [];
  for (const [name, entries] of groups) {
    const members = [...entries]
      .sort((a, b) => compareEntries(a, b, resolved))
      .map((entry) => toMember(manifest, entry, resolved, name));
    indexes.push({ name, title: titles.get(name) ?? name, members });
  }
  return indexes;
}

/** Returns a single series index, or `null` when no note declares `name`. */
export function buildSeriesIndex(
  manifest: ContentManifest,
  name: string,
  options: SeriesOptions = {},
): SeriesIndex | null {
  return (
    collectSeriesIndexes(manifest, options).find(
      (index) => index.name === name,
    ) ?? null
  );
}

export function seriesSlug(name: string): string {
  return name
    .split("/")
    .map((segment) => {
      const normalized = segment
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return normalized === ""
        ? encodeURIComponent(segment.trim())
        : normalized;
    })
    .join("/");
}

export function seriesLandingPath(
  name: string,
  options: SeriesOptions = {},
): string {
  const resolved = resolveSeriesOptions(options);
  if (resolved.basePath === "") return "";
  const slug = seriesSlug(name);
  return slug === "" ? "" : `${resolved.basePath}/${slug}`;
}

/**
 * Renders the navigation block that is appended to each note in a series.
 * `currentSlug` marks the active part with `aria-current="page"` and drives the
 * previous/next links.
 */
export function renderSeriesNavigation(
  index: SeriesIndex,
  currentSlug: string,
  options: SeriesOptions = {},
): string {
  const resolved = resolveSeriesOptions(options);
  const cls = resolved.className;
  const members = index.members;
  const position = members.findIndex((member) => member.slug === currentSlug);
  const prev = position > 0 ? members[position - 1] : undefined;
  const next =
    position >= 0 && position < members.length - 1
      ? members[position + 1]
      : undefined;

  const parts: string[] = [
    `<nav class="${escapeHtmlAttribute(cls)}" data-series="${escapeHtmlAttribute(
      index.name,
    )}" aria-label="Series navigation">`,
  ];

  if (resolved.heading && members.length > 0) {
    const label =
      resolved.positionLabel && position >= 0
        ? ` <span class="${escapeHtmlAttribute(
            cls,
          )}__position">${escapeHtml(formatPosition(position + 1, members.length))}</span>`
        : "";
    parts.push(
      `<p class="${escapeHtmlAttribute(
        cls,
      )}__title"><a class="${escapeHtmlAttribute(
        cls,
      )}__link" href="${escapeHtmlAttribute(
        members[0].permalink,
      )}">${escapeHtml(index.title)}</a>${label}</p>`,
    );
  }

  parts.push(`<ol class="${escapeHtmlAttribute(cls)}__list">`);
  members.forEach((member, i) => {
    const current = member.slug === currentSlug;
    const currentAttribute = current ? ' aria-current="page"' : "";
    const order = member.order ?? i + 1;
    parts.push(
      `<li class="${escapeHtmlAttribute(cls)}__item"><a class="${escapeHtmlAttribute(
        cls,
      )}__link" href="${escapeHtmlAttribute(
        member.permalink,
      )}" data-series-order="${escapeHtmlAttribute(
        String(order),
      )}"${currentAttribute}>${escapeHtml(member.title)}</a></li>`,
    );
  });
  parts.push("</ol>");

  parts.push(`<div class="${escapeHtmlAttribute(cls)}__nav">`);
  if (prev) {
    parts.push(
      `<a class="${escapeHtmlAttribute(
        cls,
      )}__prev" rel="prev" href="${escapeHtmlAttribute(
        prev.permalink,
      )}">&larr; ${escapeHtml(prev.title)}</a>`,
    );
  }
  if (next) {
    parts.push(
      `<a class="${escapeHtmlAttribute(
        cls,
      )}__next" rel="next" href="${escapeHtmlAttribute(
        next.permalink,
      )}">${escapeHtml(next.title)} &rarr;</a>`,
    );
  }
  parts.push("</div>");

  parts.push("</nav>");
  return parts.join("");
}

/**
 * Renders a complete series as a standalone block, suitable for a landing page.
 * Returns an empty string when the manifest has no member for `name`.
 */
export function renderSeriesIndex(
  manifest: ContentManifest,
  name: string,
  options: SeriesOptions = {},
): string {
  const index = buildSeriesIndex(manifest, name, options);
  if (!index || index.members.length === 0) return "";

  const resolved = resolveSeriesOptions(options);
  const cls = resolved.className;
  const parts: string[] = [
    `<section class="${escapeHtmlAttribute(
      cls,
    )} ${escapeHtmlAttribute(cls)}--index" data-series="${escapeHtmlAttribute(
      index.name,
    )}">`,
    `<h2 class="${escapeHtmlAttribute(cls)}__title">${escapeHtml(
      index.title,
    )}</h2>`,
    `<ol class="${escapeHtmlAttribute(cls)}__list">`,
  ];

  index.members.forEach((member, i) => {
    const order = member.order ?? i + 1;
    parts.push(
      `<li class="${escapeHtmlAttribute(cls)}__item"><a class="${escapeHtmlAttribute(
        cls,
      )}__link" href="${escapeHtmlAttribute(
        member.permalink,
      )}" data-series-order="${escapeHtmlAttribute(
        String(order),
      )}">${escapeHtml(member.title)}</a></li>`,
    );
  });

  parts.push("</ol></section>");
  return parts.join("");
}

export function renderSeriesList(
  manifest: ContentManifest,
  options: SeriesOptions = {},
  label = "Series",
): string {
  const indexes = collectSeriesIndexes(manifest, options);
  if (indexes.length === 0) return "";

  const resolved = resolveSeriesOptions(options);
  const cls = escapeHtmlAttribute(resolved.className);
  const items = indexes
    .map((index) => {
      const path = seriesLandingPath(index.name, options);
      const title = escapeHtml(index.title);
      const link =
        path === ""
          ? `<span class="${cls}__link">${title}</span>`
          : `<a class="${cls}__link" href="${escapeHtmlAttribute(path)}">${title}</a>`;
      return `<li class="${cls}__item" data-series-count="${index.members.length}">${link}</li>`;
    })
    .join("");

  return `<section class="${cls} ${cls}--list" data-series-list><h1 class="${cls}__title">${escapeHtml(
    label,
  )}</h1><ol class="${cls}__list">${items}</ol></section>`;
}

/**
 * Reports notes whose series metadata cannot be ordered reliably. Emitted
 * diagnostics use `pluginName: "series"` and `severity: "warning"`.
 */
export function collectSeriesDiagnostics(
  manifest: ContentManifest,
  options: SeriesOptions = {},
): Diagnostic[] {
  const resolved = resolveSeriesOptions(options);
  const diagnostics: Diagnostic[] = [];
  const firstByOrder = new Map<string, ContentManifestEntry>();

  for (const entry of manifest.entries) {
    if (!hasFrontmatterKey(entry, resolved.key)) continue;

    const name = readSeriesName(entry, resolved.key);
    if (!name) {
      diagnostics.push({
        code: "series-invalid-name",
        severity: "warning",
        pluginName: "series",
        slug: entry.slug,
        message: `Frontmatter \`${resolved.key}\` must be a non-empty string.`,
      });
      continue;
    }

    const order = readSeriesOrder(entry, resolved.orderKey);
    if (order === undefined) {
      diagnostics.push({
        code: "series-missing-order",
        severity: "warning",
        pluginName: "series",
        slug: entry.slug,
        message: `Note in series \`${name}\` has no numeric \`${resolved.orderKey}\`; it is ordered by date, title, then slug.`,
        meta: { series: name },
      });
      continue;
    }

    const orderKey = `${name}\u0000${order}`;
    const first = firstByOrder.get(orderKey);
    if (first) {
      diagnostics.push({
        code: "series-duplicate-order",
        severity: "warning",
        pluginName: "series",
        slug: entry.slug,
        message: `Series \`${name}\` has more than one note with \`${resolved.orderKey}: ${order}\` (also in \`${first.slug}\`).`,
        meta: { series: name, order },
      });
    } else {
      firstByOrder.set(orderKey, entry);
    }
  }

  return diagnostics;
}

function toMember(
  manifest: ContentManifest,
  entry: ContentManifestEntry,
  resolved: ResolvedSeriesOptions,
  name: string,
): SeriesMember {
  return {
    slug: entry.slug,
    title: entry.title || entry.slug,
    permalink: manifest.bySlug.get(entry.slug)?.permalink ?? entry.permalink,
    order: readSeriesOrder(entry, resolved.orderKey) ?? null,
    series: name,
  };
}

function compareEntries(
  a: ContentManifestEntry,
  b: ContentManifestEntry,
  resolved: ResolvedSeriesOptions,
): number {
  const orderA =
    readSeriesOrder(a, resolved.orderKey) ?? Number.POSITIVE_INFINITY;
  const orderB =
    readSeriesOrder(b, resolved.orderKey) ?? Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA < orderB ? -1 : 1;

  const dateA = readSeriesDate(a) ?? Number.POSITIVE_INFINITY;
  const dateB = readSeriesDate(b) ?? Number.POSITIVE_INFINITY;
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;

  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  if (a.slug !== b.slug) return a.slug < b.slug ? -1 : 1;
  return 0;
}

function readSeriesName(
  entry: ContentManifestEntry,
  key: string,
): string | undefined {
  return readString(entry, key);
}

function readSeriesOrder(
  entry: ContentManifestEntry,
  key: string,
): number | undefined {
  const value = entry.frontmatter[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function readString(
  entry: ContentManifestEntry,
  key: string,
): string | undefined {
  const value = entry.frontmatter[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readSeriesDate(entry: ContentManifestEntry): number | undefined {
  for (const key of ["date", "created", "published"] as const) {
    const time = parseDate(entry.frontmatter[key]);
    if (time !== undefined) return time;
  }
  return undefined;
}

function parseDate(value: unknown): number | undefined {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : undefined;
  }
  if (typeof value === "string") {
    const time = Date.parse(value);
    return Number.isNaN(time) ? undefined : time;
  }
  return undefined;
}

function hasFrontmatterKey(entry: ContentManifestEntry, key: string): boolean {
  return Object.hasOwn(entry.frontmatter, key);
}

function formatPosition(position: number, total: number): string {
  return `Part ${position} of ${total}`;
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.length > 1 ? prefixed.replace(/\/+$/, "") : prefixed;
}
