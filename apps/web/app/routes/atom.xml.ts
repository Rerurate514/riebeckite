import { renderAtomFeed } from "@riebeckite/plugin-seo";
import { createRoute } from "honox/factory";
import { config } from "../config";
import { getPublishedEntries } from "../lib/publication";

export default createRoute(async (c) => {
  const entries = await getPublishedEntries();

  return c.body(renderAtomFeed(config, entries), 200, {
    "content-type": "application/atom+xml; charset=utf-8",
  });
});
