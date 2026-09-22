import { renderJsonFeed } from "@riebeckite/plugin-seo";
import { createRoute } from "honox/factory";
import { config } from "../config";
import { getPublishedEntries } from "../lib/publication";

export default createRoute(async (c) => {
  const entries = await getPublishedEntries();

  return c.json(JSON.parse(renderJsonFeed(config, entries)));
});
