import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { showRoutes } from "hono/dev";
import { createApp } from "honox/server";
import { config } from "./config";
import { content } from "./content";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
  },
});

showRoutes(app);

export default app;
