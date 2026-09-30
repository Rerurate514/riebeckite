/**
 * Copy-to-clipboard enhancement for `@riebeckite/plugin-share`.
 *
 * The share links are plain anchors and work without JavaScript. Only the
 * copy-link action needs a runtime: it starts hidden and is revealed here, so
 * no-JS readers never see a control that cannot work.
 */

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
  const copied = await copyToClipboard(url);

  if (status) {
    status.textContent = copied
      ? button.dataset.rrShareCopied || "Copied"
      : button.dataset.rrShareCopyFailed || "Copy failed";
  }
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back to the legacy path below.
  }

  return copyWithExecCommand(value);
}

function copyWithExecCommand(value: string): boolean {
  const selection = window.getSelection();
  const savedRanges: Range[] = [];
  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      savedRanges.push(selection.getRangeAt(index).cloneRange());
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    if (selection && savedRanges.length > 0) {
      selection.removeAllRanges();
      for (const range of savedRanges) selection.addRange(range);
    }
  }

  return copied;
}
