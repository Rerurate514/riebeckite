import type {
  ContentManifestEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type {
  TaxonomyFeedFormat,
  TaxonomyHeadTag,
  TaxonomyTerm,
} from "./types.js";
import { buildTaxonomyAbsoluteUrl } from "./url.js";
import { escapeTaxonomyXml } from "./xml.js";

/**
 * Renders a per-term feed. Term feeds carry their own channel title and self
 * link so a tag subscription is distinguishable from the site-wide feed that
 * `@riebeckite/plugin-seo` owns.
 */
export function renderTermFeed(
  config: ResolvedRiebeckiteConfig,
  term: TaxonomyTerm,
  format: TaxonomyFeedFormat,
  limit = 0,
): string {
  const entries = limit > 0 ? term.entries.slice(0, limit) : term.entries;
  const title = `${term.title} | ${config.site.title}`;
  const feedUrl = buildTaxonomyAbsoluteUrl(config, term.path);

  switch (format) {
    case "rss":
      return renderRss(config, term, entries, title, feedUrl);
    case "atom":
      return renderAtom(config, term, entries, title, feedUrl);
    case "json":
      return renderJson(config, term, entries, title);
    default:
      return "";
  }
}

/** Builds the `<link rel="alternate">` discovery tags for a term. */
export function buildFeedHeadTags(term: TaxonomyTerm): TaxonomyHeadTag[] {
  const tags: TaxonomyHeadTag[] = [];
  if (term.feeds.rss) {
    tags.push({
      tag: "link",
      attrs: {
        rel: "alternate",
        type: "application/rss+xml",
        title: term.title,
        href: term.feeds.rss,
      },
    });
  }
  if (term.feeds.atom) {
    tags.push({
      tag: "link",
      attrs: {
        rel: "alternate",
        type: "application/atom+xml",
        title: term.title,
        href: term.feeds.atom,
      },
    });
  }
  if (term.feeds.json) {
    tags.push({
      tag: "link",
      attrs: {
        rel: "alternate",
        type: "application/feed+json",
        title: term.title,
        href: term.feeds.json,
      },
    });
  }
  return tags;
}

function renderRss(
  config: ResolvedRiebeckiteConfig,
  term: TaxonomyTerm,
  entries: readonly ContentManifestEntry[],
  title: string,
  feedUrl: string,
): string {
  const feed = getResolvedFeedMetadata(config);
  const self = buildTaxonomyAbsoluteUrl(config, `${term.path}/feed.xml`);
  const items = entries
    .map((entry) => {
      const url = buildTaxonomyAbsoluteUrl(config, entry.permalink);
      const pubDate = getPublishedTime(entry);
      return `<item><title>${escapeTaxonomyXml(entry.title)}</title><link>${escapeTaxonomyXml(url)}</link><guid>${escapeTaxonomyXml(url)}</guid><description>${escapeTaxonomyXml(getDescription(entry))}</description>${pubDate ? `<pubDate>${new Date(pubDate).toUTCString()}</pubDate>` : ""}</item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeTaxonomyXml(title)}</title><link>${escapeTaxonomyXml(feedUrl)}</link><description>${escapeTaxonomyXml(feed.description)}</description><language>${escapeTaxonomyXml(feed.language)}</language><atom:link href="${escapeTaxonomyXml(self)}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}

function renderAtom(
  config: ResolvedRiebeckiteConfig,
  term: TaxonomyTerm,
  entries: readonly ContentManifestEntry[],
  title: string,
  feedUrl: string,
): string {
  const self = buildTaxonomyAbsoluteUrl(config, `${term.path}/atom.xml`);
  const updated =
    entries.map(getUpdatedTime).find(Boolean) ?? new Date(0).toISOString();
  const items = entries
    .map((entry) => {
      const url = buildTaxonomyAbsoluteUrl(config, entry.permalink);
      return `<entry><title>${escapeTaxonomyXml(entry.title)}</title><link href="${escapeTaxonomyXml(url)}"/><id>${escapeTaxonomyXml(url)}</id><updated>${escapeTaxonomyXml(getUpdatedTime(entry) ?? updated)}</updated><summary>${escapeTaxonomyXml(getDescription(entry))}</summary></entry>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>${escapeTaxonomyXml(title)}</title><link href="${escapeTaxonomyXml(feedUrl)}"/><link rel="self" href="${escapeTaxonomyXml(self)}"/><id>${escapeTaxonomyXml(feedUrl)}</id><updated>${escapeTaxonomyXml(updated)}</updated>${items}</feed>`;
}

function renderJson(
  config: ResolvedRiebeckiteConfig,
  term: TaxonomyTerm,
  entries: readonly ContentManifestEntry[],
  title: string,
): string {
  const feed = getResolvedFeedMetadata(config);
  const self = buildTaxonomyAbsoluteUrl(config, `${term.path}/feed.json`);
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title,
    home_page_url: buildTaxonomyAbsoluteUrl(config, ""),
    feed_url: self,
    description: feed.description,
    language: feed.language,
    items: entries.map((entry) => {
      const url = buildTaxonomyAbsoluteUrl(config, entry.permalink);
      return {
        id: url,
        url,
        title: entry.title,
        content_html: entry.html,
        summary: getDescription(entry),
        date_published: getPublishedTime(entry) ?? undefined,
        date_modified: getUpdatedTime(entry) ?? undefined,
        tags: entry.tags,
      };
    }),
  });
}

function getResolvedFeedMetadata(config: ResolvedRiebeckiteConfig): {
  description: string;
  language: string;
} {
  return {
    description: config.site.feed.description ?? config.site.description,
    language: config.site.feed.language ?? config.site.locale.replace("_", "-"),
  };
}

function getDescription(entry: ContentManifestEntry): string {
  const description = entry.frontmatter.description;
  if (typeof description === "string" && description.trim() !== "") {
    return description.trim();
  }
  return entry.title;
}

function getPublishedTime(entry: ContentManifestEntry): string | null {
  return toIso(
    entry.frontmatter.published ??
      entry.frontmatter.date ??
      entry.frontmatter.created,
  );
}

function getUpdatedTime(entry: ContentManifestEntry): string | null {
  return toIso(entry.frontmatter.updated) ?? getPublishedTime(entry);
}

function toIso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
