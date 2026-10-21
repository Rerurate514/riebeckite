import { Hono } from "hono";
import { handlePreviewRequest } from "./preview-api-route";
import { previewRegistry } from "./preview-registry";

const app = new Hono();
app.post("/api/playground", (c) => handlePreviewRequest(c, previewRegistry));

export default app;
