import {
  type ContentManifest,
  escapeHtml,
  escapeHtmlAttribute,
  type PluginDataHelper,
  type PublicContentEntry,
  type PublicContentView,
  selectLocalizedEntries,
} from "@riebeckite/core";
import { buildSeriesIndex, collectSeriesIndexes } from "./series_index.js";
import { resolveSeriesOptions, seriesSlug } from "./series_options.js";
import type { SeriesIndex, SeriesOptions } from "./types.js";

export const getSeriesNavigation: PluginDataHelper<
  {
    view: PublicContentView;
    entry: PublicContentEntry;
    index: SeriesIndex | null;
  },
  SeriesIndex | null
> = ({ view, entry, index }) => {
  if (!index || !view.findDiscoverableBySlug(entry.slug)) return null;
  const allowed = new Set(
    selectLocalizedEntries(view.discoverableEntries, {
      mode: "current",
      locale: entry.publicLocation.language,
      ...(view.localization?.fallbackLocale
        ? { fallbackLocale: view.localization.fallbackLocale }
        : {}),
    }).map((candidate) => candidate.slug),
  );
  const members = index.members.filter(
    (member) =>
      allowed.has(member.slug) && view.findDiscoverableBySlug(member.slug),
  );
  return members.some((member) => member.slug === entry.slug)
    ? { ...index, members }
    : null;
};

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
    `<h1 class="${escapeHtmlAttribute(cls)}__title">${escapeHtml(
      index.title,
    )}</h1>`,
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

export function formatPosition(position: number, total: number): string {
  return `Part ${position} of ${total}`;
}
