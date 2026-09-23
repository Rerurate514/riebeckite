import { createRoute } from "honox/factory";
import { config } from "../config";
import { getPublishedEntries } from "../lib/publication";
import { renderAtomFeed } from "../lib/seo";

export default createRoute(async (c) => {
  const entries = await getPublishedEntries();

  return c.body(renderAtomFeed(config, entries), 200, {
    "content-type": "application/atom+xml; charset=utf-8",
  });
});
