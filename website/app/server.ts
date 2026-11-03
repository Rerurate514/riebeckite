import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";
import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { showRoutes } from "hono/dev";
import { createApp } from "honox/server";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
  },
});

showRoutes(app);

export default app;
export { config, content };
