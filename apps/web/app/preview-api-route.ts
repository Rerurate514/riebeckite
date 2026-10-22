import {
  createPreview,
  type PreviewRegistry,
  parsePreviewRequest,
} from "@riebeckite/preview";

type PreviewRequestContext = {
  readonly req: {
    header(name: string): string | undefined;
    readonly raw: Request;
  };
  header(name: string, value: string): void;
  json(body: unknown, status?: 400 | 413): Response;
};

export async function handlePreviewRequest(
  c: PreviewRequestContext,
  registry: PreviewRegistry,
): Promise<Response> {
  c.header("cache-control", "no-store");
  c.header("x-content-type-options", "nosniff");
  const parsed = await parsePreviewRequest(c.req.raw, registry);
  if (parsed.kind === "too-large") {
    return c.json({ error: "Preview input is too large." }, 413);
  }
  if (parsed.kind === "invalid") {
    return c.json({ error: "Invalid preview input." }, 400);
  }
  const previewInput = parsed.input;
  const preview = createPreview({ registry, fixture: previewInput.fixtureId });
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
