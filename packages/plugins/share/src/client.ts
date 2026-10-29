/**
 * Copy-to-clipboard enhancement for `@riebeckite/plugin-share`.
 *
 * The share links are plain anchors and work without JavaScript. Only the
 * copy-link action needs a runtime: it starts hidden and is revealed here, so
 * no-JS readers never see a control that cannot work.
 */

import { copyText } from "@riebeckite/ui/copy";

const COPY_SELECTOR = "[data-rr-share-copy]";
const STATUS_SELECTOR = ".rr-share__status";

export function initShare(): void {
  if (typeof document === "undefined") return;

  const buttons = document.querySelectorAll<HTMLButtonElement>(COPY_SELECTOR);
  for (const button of buttons) {
    button.hidden = false;
    if (button.dataset.rrShareReady === "true") continue;
    button.dataset.rrShareReady = "true";
    button.addEventListener("click", () => {
      void handleCopy(button);
    });
  }
}

async function handleCopy(button: HTMLButtonElement): Promise<void> {
  const url = button.dataset.shareUrl || window.location.href;
  const status = button
    .closest("[data-rr-share]")
    ?.querySelector<HTMLElement>(STATUS_SELECTOR);
  const copied = await copyText(url);

  if (status) {
    status.textContent = copied
      ? button.dataset.rrShareCopied || "Copied"
      : button.dataset.rrShareCopyFailed || "Copy failed";
  }
}
