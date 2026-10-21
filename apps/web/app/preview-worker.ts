import { Hono } from "hono";
import { handlePreviewRequest } from "./preview-api-route";
import { previewRegistry } from "./preview-registry";

const app = new Hono();
app.use("/api/*", async (c, next) => {
  await next();
  c.header("cache-control", "no-store");
  c.header("x-content-type-options", "nosniff");
});
app.post("/api/playground", (c) => handlePreviewRequest(c, previewRegistry));

export default app;
