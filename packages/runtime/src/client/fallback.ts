import { RuntimeUnsupportedError } from "../core/errors.js";

const FALLBACK_SELECTOR = "[data-runtime-fallback]";
const LOADING_SELECTOR = "[data-runtime-loading]";
const ERROR_SELECTOR = "[data-runtime-error]";

export type RuntimeFallback = {
  showLoading(): void;
  showReady(): void;
  showError(error: unknown): void;
  reset(): void;
};

export function createRuntimeFallback(root: Element): RuntimeFallback {
  if (typeof Element === "undefined" || !(root instanceof Element)) {
    throw new RuntimeUnsupportedError(
      "A runtime fallback requires a DOM element and must not be created during SSR.",
    );
  }

  const fallback = root.querySelector<HTMLElement>(FALLBACK_SELECTOR);
  const loading = root.querySelector<HTMLElement>(LOADING_SELECTOR);
  const error = root.querySelector<HTMLElement>(ERROR_SELECTOR);

  const setBusy = (busy: boolean) => {
    if (busy) {
      root.setAttribute("aria-busy", "true");
    } else {
      root.removeAttribute("aria-busy");
    }
  };

  return {
    showLoading() {
      if (fallback) fallback.hidden = true;
      if (loading) loading.hidden = false;
      if (error) error.hidden = true;
      setBusy(true);
    },
    showReady() {
      if (fallback) fallback.hidden = true;
      if (loading) loading.hidden = true;
      if (error) error.hidden = true;
      setBusy(false);
    },
    showError(cause) {
      if (fallback) fallback.hidden = false;
      if (loading) loading.hidden = true;
      if (error) {
        error.hidden = false;
        error.textContent =
          cause instanceof Error ? cause.message : String(cause);
      }
      setBusy(false);
    },
    reset() {
      if (fallback) fallback.hidden = false;
      if (loading) loading.hidden = true;
      if (error) {
        error.hidden = true;
        error.textContent = "";
      }
      setBusy(false);
    },
  };
}
