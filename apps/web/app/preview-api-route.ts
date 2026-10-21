import { createPreview, type PreviewRegistry } from "@riebeckite/preview";
import {
  isPreviewRequestSizeAllowed,
  parsePreviewApiInput,
} from "./preview-api";

type PreviewRequestContext = {
  readonly req: {
    header(name: string): string | undefined;
    json(): Promise<unknown>;
  };
  json(body: unknown, status?: 400 | 413): Response;
};

export async function handlePreviewRequest(
  c: PreviewRequestContext,
  registry: PreviewRegistry,
): Promise<Response> {
  if (!isPreviewRequestSizeAllowed(c.req.header("content-length"))) {
    return c.json({ error: "Preview input is too large." }, 413);
  }
  const input = await c.req.json().catch(() => undefined);
  const previewInput = parsePreviewApiInput(input, registry);
  if (!previewInput) {
    return c.json({ error: "Invalid preview input." }, 400);
  }
  const preview = createPreview({ registry });
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
}
