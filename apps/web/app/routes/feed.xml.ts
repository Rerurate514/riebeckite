import { createRoute } from "honox/factory";
import { config } from "../config";
import { getPublishedEntries } from "../lib/publication";
import { renderRssFeed } from "../lib/seo";

export default createRoute(async (c) => {
  const entries = await getPublishedEntries();

  return c.body(renderRssFeed(config, entries), 200, {
    "content-type": "application/rss+xml; charset=utf-8",
  });
});
