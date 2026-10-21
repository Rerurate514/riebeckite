import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";
import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { showRoutes } from "hono/dev";
import { createApp } from "honox/server";
import { handlePreviewRequest } from "./preview-api-route";
import { previewRegistry } from "./preview-registry";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
    app.get("/playground/", (c) => {
      const url = new URL(c.req.url);
      return c.redirect(`/playground${url.search}`, 308);
    });
    app.post("/api/playground", (c) =>
      handlePreviewRequest(c, previewRegistry),
    );
  },
});

showRoutes(app);

export default app;
export { config, content };
