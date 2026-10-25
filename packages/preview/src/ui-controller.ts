import type { PreviewSession } from "./preview.js";

export type PreviewUiInput = {
  readonly markdown: string;
  readonly pluginId?: string;
  readonly fixtureId?: string;
  readonly pageId?: string;
  readonly options: Readonly<Record<string, unknown>>;
};

export type PreviewUiResponse = {
  readonly html: string;
  readonly diagnostics: readonly PreviewUiDiagnostic[];
};

export type PreviewUiDiagnostic = {
  readonly severity: string;
  readonly message: string;
};

export type PreviewUiState =
  | { readonly kind: "rendering" }
  | { readonly kind: "rendered"; readonly response: PreviewUiResponse };

export type PreviewUiController = {
  readonly render: (input: PreviewUiInput) => Promise<void>;
  readonly dispose: () => void;
};

export type PreviewUiTransport = (
  input: PreviewUiInput,
  signal: AbortSignal,
) => Promise<PreviewUiResponse | undefined>;

export type CreatePreviewUiControllerOptions = {
  readonly request: PreviewUiTransport;
  readonly onStateChange: (state: PreviewUiState) => void;
};

export function createPreviewSessionTransport(
  session: Pick<PreviewSession, "render">,
): PreviewUiTransport {
  let pending = Promise.resolve();
  return (input, signal) => {
    const response = pending.then(async () => {
      if (signal.aborted) return undefined;
      const result = await session.render(input);
      return signal.aborted ? undefined : result;
    });
    pending = response.then(
      () => undefined,
      () => undefined,
    );
    return response;
  };
}

export function createPreviewUiController(
  options: CreatePreviewUiControllerOptions,
): PreviewUiController {
  let request: AbortController | undefined;
  let revision = 0;
  let disposed = false;

  return {
    async render(input) {
      if (disposed) return;
      request?.abort();
      request = new AbortController();
      const currentRequest = request;
      const currentRevision = ++revision;
      options.onStateChange({ kind: "rendering" });
      const response = await options.request(input, currentRequest.signal);
      if (
        disposed ||
        currentRevision !== revision ||
        currentRequest.signal.aborted ||
        !response
      ) {
        return;
      }
      options.onStateChange({ kind: "rendered", response });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      revision += 1;
      request?.abort();
    },
  };
}
