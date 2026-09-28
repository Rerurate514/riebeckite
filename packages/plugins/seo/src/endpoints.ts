import type { PluginEndpoint } from "@riebeckite/core";
import { filterFeedEntries } from "./content.js";
import { renderAtomFeed, renderJsonFeed, renderRssFeed } from "./feeds.js";
import { renderRobots, renderSitemap } from "./site-files.js";
import type { SeoPluginOptions } from "./types.js";

export function createSeoEndpoints(
  options: SeoPluginOptions,
): PluginEndpoint[] {
  return [
    options.sitemap === true
      ? {
          path: "/sitemap.xml",
          handler: ({ config, manifest }) => ({
            headers: { "content-type": "application/xml; charset=utf-8" },
            body: renderSitemap(config, manifest.entries),
          }),
        }
      : null,
    options.robots === true
      ? {
          path: "/robots.txt",
          handler: ({ config }) => ({
            headers: { "content-type": "text/plain; charset=utf-8" },
            body: renderRobots(config),
          }),
        }
      : null,
    options.feed?.rss === true
      ? {
          path: "/feed.xml",
          handler: ({ config, manifest }) => ({
            headers: { "content-type": "application/rss+xml; charset=utf-8" },
            body: renderRssFeed(
              config,
              filterFeedEntries(config, manifest.entries),
            ),
          }),
        }
      : null,
    options.feed?.atom === true
      ? {
          path: "/atom.xml",
          handler: ({ config, manifest }) => ({
            headers: { "content-type": "application/atom+xml; charset=utf-8" },
            body: renderAtomFeed(
              config,
              filterFeedEntries(config, manifest.entries),
            ),
          }),
        }
      : null,
    options.feed?.json === true
      ? {
          path: "/feed.json",
          handler: ({ config, manifest }) => ({
            json: JSON.parse(
              renderJsonFeed(
                config,
                filterFeedEntries(config, manifest.entries),
              ),
            ),
          }),
        }
      : null,
  ].filter((endpoint) => endpoint !== null);
}
