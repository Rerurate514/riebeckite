import type { PluginEndpoint } from "@riebeckite/core";
import { filterFeedEntries } from "./content.js";
import { renderAtomFeed, renderJsonFeed, renderRssFeed } from "./feeds.js";
import { renderRobots, renderSitemap } from "./site-files.js";
import type { SeoPluginOptions } from "./types.js";

export function createSeoEndpoints(
  options: SeoPluginOptions,
): PluginEndpoint[] {
  const endpoints: PluginEndpoint[] = [];

  if (options.sitemap === true) {
    endpoints.push({
      path: "/sitemap.xml",
      handler: ({ config, manifest }) => ({
        headers: { "content-type": "application/xml; charset=utf-8" },
        body: renderSitemap(config, manifest.entries),
      }),
    });
  }

  if (options.robots === true) {
    endpoints.push({
      path: "/robots.txt",
      handler: ({ config }) => ({
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: renderRobots(config),
      }),
    });
  }

  if (options.feed?.rss === true) {
    endpoints.push({
      path: "/feed.xml",
      handler: ({ config, manifest }) => ({
        headers: { "content-type": "application/rss+xml; charset=utf-8" },
        body: renderRssFeed(
          config,
          filterFeedEntries(config, manifest.entries),
        ),
      }),
    });
  }

  if (options.feed?.atom === true) {
    endpoints.push({
      path: "/atom.xml",
      handler: ({ config, manifest }) => ({
        headers: { "content-type": "application/atom+xml; charset=utf-8" },
        body: renderAtomFeed(
          config,
          filterFeedEntries(config, manifest.entries),
        ),
      }),
    });
  }

  if (options.feed?.json === true) {
    endpoints.push({
      path: "/feed.json",
      handler: ({ config, manifest }) => ({
        json: JSON.parse(
          renderJsonFeed(config, filterFeedEntries(config, manifest.entries)),
        ),
      }),
    });
  }

  return endpoints;
}
