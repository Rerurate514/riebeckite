import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";
import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { createPreview, definePluginPreview } from "@riebeckite/preview";
import { showRoutes } from "hono/dev";
import { createApp } from "honox/server";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
    app.post("/api/playground", async (c) => {
      const input = await c.req.json().catch(() => undefined);
      if (!isPreviewInput(input)) {
        return c.json({ error: "Invalid preview input." }, 400);
      }
      const preview = createPreview({
        plugins: [
          definePluginPreview({
            id: "code-tabs",
            title: "Code tabs",
            availability: "browser",
            fixtures: [],
            create: (options: { syncTabs?: boolean } | undefined) =>
              codeTabs(options),
          }),
        ],
      });
      try {
        return c.json(
          await preview.render({
            markdown: input.markdown,
            pluginId: input.pluginId,
            options: input.options,
          }),
        );
      } finally {
        await preview.dispose();
      }
    });
  },
});

function isPreviewInput(
  input: unknown,
): input is {
  readonly markdown: string;
  readonly pluginId?: string;
  readonly options?: { readonly syncTabs: boolean };
} {
  if (!input || typeof input !== "object") return false;
  const value = input as Record<string, unknown>;
  return (
    typeof value.markdown === "string" &&
    value.markdown.length <= 100_000 &&
    (value.pluginId === undefined ||
      value.pluginId === "" ||
      value.pluginId === "code-tabs") &&
    (value.options === undefined ||
      (typeof value.options === "object" &&
        value.options !== null &&
        typeof (value.options as Record<string, unknown>).syncTabs === "boolean"))
  );
}

showRoutes(app);

export default app;
export { config, content };
