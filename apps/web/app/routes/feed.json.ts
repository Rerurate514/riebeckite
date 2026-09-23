import { createRoute } from "honox/factory";
import { config } from "../config";
import { getPublishedEntries } from "../lib/publication";
import { renderJsonFeed } from "../lib/seo";

export default createRoute(async (c) => {
  const entries = await getPublishedEntries();

  return c.json(JSON.parse(renderJsonFeed(config, entries)));
});
