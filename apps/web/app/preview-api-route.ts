import { createPreview, type PreviewRegistry } from "@riebeckite/preview";
import {
  isPreviewRequestSizeAllowed,
  parsePreviewApiInput,
} from "./preview-api";

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
  if (!isPreviewRequestSizeAllowed(c.req.header("content-length"))) {
    return c.json({ error: "Preview input is too large." }, 413);
  }
  const input = await readPreviewRequest(c.req.raw);
  const previewInput = parsePreviewApiInput(input, registry);
  if (!previewInput) {
    return c.json({ error: "Invalid preview input." }, 400);
  }
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

async function readPreviewRequest(
  request: Request,
): Promise<unknown | undefined> {
  const body = request.body;
  if (!body) return undefined;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const maximumLength = 111_000;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximumLength) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(chunk.value);
    }
  } catch {
    return undefined;
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(new TextDecoder().decode(concat(chunks, length)));
  } catch {
    return undefined;
  }
}

function concat(chunks: readonly Uint8Array[], length: number): Uint8Array {
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
