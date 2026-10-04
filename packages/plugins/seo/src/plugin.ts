import { definePlugin } from "@riebeckite/core";
import {
  getDescription,
  getEntryPublishedTime,
  getEntryUpdatedTime,
  getHtmlLanguage,
} from "./content.js";
import { createSeoEndpoints } from "./endpoints.js";
import { renderAtomFeed, renderJsonFeed, renderRssFeed } from "./feeds.js";
import { buildArticleSeo, buildWebsiteSeo } from "./metadata.js";
import { renderRobots, renderSitemap } from "./site-files.js";
import type { SeoPluginOptions } from "./types.js";
import { buildAbsoluteUrl, buildPostUrl } from "./url.js";

export function seo(options: SeoPluginOptions = {}) {
  return definePlugin({
    name: "seo",
    options,
    seo: {
      buildArticleSeo: (config, permalink, post, headTags) =>
        buildArticleSeo(config, options, permalink, post, headTags),
      buildWebsiteSeo: (config, input, headTags) =>
        buildWebsiteSeo(config, options, input, headTags),
      buildAbsoluteUrl,
      buildPostUrl,
      getDescription,
      getEntryPublishedTime,
      getEntryUpdatedTime,
      getHtmlLanguage,
      renderSitemap,
      renderRobots,
      renderRssFeed,
      renderAtomFeed,
      renderJsonFeed,
    },
    endpoints: createSeoEndpoints(options),
  });
}
