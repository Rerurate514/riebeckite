import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { createApp } from "honox/server";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
  },
});

export default app;
export { config, content };
