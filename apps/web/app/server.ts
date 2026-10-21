import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";
import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { createPreview } from "@riebeckite/preview";
import { showRoutes } from "hono/dev";
import { createApp } from "honox/server";
import {
  isPreviewRequestSizeAllowed,
  parsePreviewApiInput,
} from "./preview-api";
import { previewRegistry } from "./preview-registry";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
    app.post("/api/playground", async (c) => {
      if (!isPreviewRequestSizeAllowed(c.req.header("content-length"))) {
        return c.json({ error: "Preview input is too large." }, 413);
      }
      const input = await c.req.json().catch(() => undefined);
      const previewInput = parsePreviewApiInput(input, previewRegistry);
      if (!previewInput) {
        return c.json({ error: "Invalid preview input." }, 400);
      }
      const preview = createPreview({ registry: previewRegistry });
      try {
        return c.json(
          await preview.render({
            markdown: previewInput.markdown,
            pluginId: previewInput.pluginId,
            options: previewInput.options,
          }),
        );
      } finally {
        await preview.dispose();
      }
    });
  },
});

showRoutes(app);

export default app;
export { config, content };
