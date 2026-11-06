export type LoadingState = "loading" | "ready" | "error";

export type LoadingControllerOptions = {
  readonly signal?: AbortSignal;
};

export type LoadingController = {
  readonly start: () => void;
  readonly stop: () => void;
  readonly fail: (error?: unknown) => void;
  readonly state: () => LoadingState;
  readonly destroy: () => void;
};

export function createLoadingController(
  root: Element,
  options: LoadingControllerOptions = {},
): LoadingController {
  let state: LoadingState = "ready";
  let destroyed = false;

  const indicators = () =>
    Array.from(root.querySelectorAll<HTMLElement>("[data-loading]"));
  const errors = () =>
    Array.from(root.querySelectorAll<HTMLElement>("[data-loading-error]"));
  const busyTarget = () =>
    root.querySelector<HTMLElement>("[data-loading-content]") ?? root;

  const setHidden = (elements: readonly HTMLElement[], hidden: boolean) => {
    for (const element of elements) element.hidden = hidden;
  };

  const setBusy = (busy: boolean) => {
    const target = busyTarget();
    if (busy) target.setAttribute("aria-busy", "true");
    else target.removeAttribute("aria-busy");
  };

  const start = () => {
    if (destroyed) return;
    state = "loading";
    root.setAttribute("data-loading-state", state);
    setHidden(indicators(), false);
    for (const element of errors()) {
      element.hidden = true;
      element.textContent = "";
    }
    setBusy(true);
  };

  const stop = () => {
    if (destroyed) return;
    state = "ready";
    root.setAttribute("data-loading-state", state);
    setHidden(indicators(), true);
    setHidden(errors(), true);
    setBusy(false);
  };

  const fail = (error?: unknown) => {
    if (destroyed) return;
    state = "error";
    root.setAttribute("data-loading-state", state);
    setHidden(indicators(), true);
    setBusy(false);
    const message = errorMessage(error);
    for (const element of errors()) {
      element.textContent = message;
      element.hidden = message.length === 0;
    }
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    state = "ready";
    options.signal?.removeEventListener("abort", destroy);
    root.removeAttribute("data-loading-state");
    setHidden(indicators(), true);
    setHidden(errors(), true);
    setBusy(false);
  };

  if (options.signal) {
    if (options.signal.aborted) destroy();
    else options.signal.addEventListener("abort", destroy, { once: true });
  }

  return {
    start,
    stop,
    fail,
    state: () => state,
    destroy,
  };
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return error == null ? "" : String(error);
}
