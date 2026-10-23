import type {
  DiagramBuildRenderer,
  DiagramBuildResult,
  DiagramSession,
} from "./types.js";

export function createRenderSession<TResource = undefined>(options: {
  render: DiagramBuildRenderer<TResource>;
  launch?: () => Promise<TResource>;
  cleanup?: (resource: TResource) => Promise<void> | void;
  timeoutMs?: number;
  retry?: (result: Extract<DiagramBuildResult, { ok: false }>) => boolean;
}): DiagramSession {
  let queue: Promise<unknown> = Promise.resolve();
  let disposed = false;
  let resourceLoaded = false;
  let resource: TResource | undefined;
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const current = queue.then(task, task);
    queue = current.then(
      () => undefined,
      () => undefined,
    );
    return current;
  };
  const ensureResource = async (): Promise<TResource> => {
    if (resourceLoaded || !options.launch) return resource as TResource;
    resource = await options.launch();
    resourceLoaded = true;
    return resource;
  };
  const run = async (
    source: string,
    context: { id: string; theme?: string; signal?: AbortSignal },
  ): Promise<DiagramBuildResult> => {
    if (disposed)
      return {
        ok: false,
        kind: "aborted",
        message: "Diagram render session is disposed.",
      };
    if (context.signal?.aborted)
      return {
        ok: false,
        kind: "aborted",
        message: "Diagram rendering was aborted.",
      };
    try {
      const currentResource = await ensureResource();
      const result = await renderOnce(
        options.render,
        source,
        context,
        currentResource,
        options.timeoutMs,
      );
      if (result.ok === true || !options.retry?.(result)) return result;
      return await renderOnce(
        options.render,
        source,
        context,
        currentResource,
        options.timeoutMs,
      );
    } catch (error) {
      return {
        ok: false,
        kind: "renderer-error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  };
  return {
    render(source, context) {
      return enqueue(() => run(source, context));
    },
    dispose() {
      return enqueue(async () => {
        if (disposed) return;
        disposed = true;
        if (resourceLoaded) await options.cleanup?.(resource as TResource);
        resource = undefined;
        resourceLoaded = false;
      });
    },
  };
}

async function renderOnce<TResource>(
  render: DiagramBuildRenderer<TResource>,
  source: string,
  context: { id: string; theme?: string; signal?: AbortSignal },
  resource: TResource,
  timeoutMs: number | undefined,
): Promise<DiagramBuildResult> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  context.signal?.addEventListener("abort", abort, { once: true });
  try {
    const result = await withTimeout(
      render(
        source,
        { id: context.id, theme: context.theme, signal: controller.signal },
        resource,
      ),
      timeoutMs,
      controller,
    );
    if (context.signal?.aborted) {
      return {
        ok: false,
        kind: "aborted",
        message: "Diagram rendering was aborted.",
      };
    }
    return result;
  } catch (error) {
    if (context.signal?.aborted) {
      return {
        ok: false,
        kind: "aborted",
        message: "Diagram rendering was aborted.",
      };
    }
    if (error instanceof RenderTimeoutError) {
      return {
        ok: false,
        kind: "timeout",
        message: "Diagram rendering timed out.",
      };
    }
    return {
      ok: false,
      kind: "renderer-error",
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    context.signal?.removeEventListener("abort", abort);
  }
}

class RenderTimeoutError extends Error {}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  controller: AbortController,
): Promise<T> {
  if (!timeoutMs) return promise;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new RenderTimeoutError());
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
