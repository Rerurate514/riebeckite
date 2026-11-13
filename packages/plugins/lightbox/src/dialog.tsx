/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { findOverlayHost } from "@riebeckite/ui/overlay";
import { createRoot } from "hono/jsx/dom/client";

export function LightboxDialog({
  expandLabel,
  closeLabel,
}: {
  expandLabel: string;
  closeLabel: string;
}) {
  return (
    <dialog class="rr-lightbox" aria-label={expandLabel}>
      <figure class="rr-lightbox__frame" data-loading-content="">
        <img class="rr-lightbox__image" decoding="async" alt="" />
        <figcaption class="rr-lightbox__caption" />
      </figure>
      <p
        class="rr-lightbox__status"
        data-loading=""
        role="status"
        aria-live="polite"
        hidden
      >
        Loading image…
      </p>
      <p class="rr-lightbox__error" data-loading-error="" role="alert" hidden />
      <button class="rr-lightbox__close" type="button" aria-label={closeLabel}>
        ×
      </button>
    </dialog>
  );
}

export function createDialog(options: {
  expandLabel: string;
  closeLabel: string;
}) {
  const appHost = findOverlayHost("lightbox");
  const host = appHost ?? document.createElement("div");
  if (!appHost) document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<LightboxDialog {...options} />);

  const element = host.querySelector<HTMLDialogElement>("dialog");
  const image = host.querySelector<HTMLImageElement>(".rr-lightbox__image");
  const caption = host.querySelector<HTMLElement>(".rr-lightbox__caption");
  const closeButton = host.querySelector<HTMLButtonElement>(
    ".rr-lightbox__close",
  );
  if (!element || !image || !caption || !closeButton) {
    root.unmount();
    if (!appHost) host.remove();
    throw new Error("Failed to create the lightbox dialog.");
  }

  return {
    element,
    image,
    caption,
    closeButton,
    destroy: () => {
      root.unmount();
      if (!appHost) host.remove();
    },
  };
}
