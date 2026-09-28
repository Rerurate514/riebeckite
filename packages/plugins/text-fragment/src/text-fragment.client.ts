import { buildQuoteMarkdown, buildTextFragmentUrl } from "./text-fragment.js";

/** Article body container emitted by the Honox article primitives. */
const ARTICLE_SELECTOR =
  "[data-slot='article-body'], .rb-article-body, .prose, article";

/** Regions a text fragment link makes no sense for. */
const EXCLUDED_SELECTOR = "pre, code, a[href], [data-no-share]";

const POPOVER_GAP = 8;

let initialized = false;

type ActiveSelection = {
  readonly text: string;
  readonly rect: DOMRect;
};

/**
 * Enables a popover with "リンクをコピー" (text fragment deep link) and
 * "引用をコピー" (Markdown quote) actions for the current text selection.
 *
 * Client-only: returns immediately when there is no `document`, and only wires
 * its listeners once per page.
 */
export function initTextFragmentShare(): void {
  if (typeof document === "undefined") return;
  if (initialized) return;
  initialized = true;

  const popover = document.createElement("div");
  popover.className = "rr-text-fragment";
  popover.hidden = true;
  popover.setAttribute("role", "group");
  popover.setAttribute("aria-label", "選択したテキストを共有");

  const actions = document.createElement("div");
  actions.className = "rr-text-fragment__actions";

  const linkButton = createButton("リンクをコピー");
  const quoteButton = createButton("引用をコピー");

  const status = document.createElement("p");
  status.className = "rr-text-fragment__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  actions.append(linkButton, quoteButton);
  popover.append(actions, status);
  document.body.appendChild(popover);

  let active: ActiveSelection | null = null;
  // The `execCommand` fallback moves the DOM selection, which fires
  // `selectionchange`. Ignore those events until the copy has settled.
  let isCopying = false;

  const hide = () => {
    active = null;
    popover.hidden = true;
    status.textContent = "";
  };

  const show = (selection: ActiveSelection, resetStatus: boolean) => {
    active = selection;
    if (resetStatus) status.textContent = "";
    popover.hidden = false;
    positionPopover(popover, selection.rect);
  };

  const refresh = () => {
    if (isCopying) return;

    const selection = readShareableSelection();
    if (!selection) {
      hide();
      return;
    }

    show(selection, active?.text !== selection.text);
  };

  const copy = async (
    buildValue: (selection: string) => string,
    successMessage: string,
  ) => {
    const selection = active;
    if (!selection) return;

    isCopying = true;
    try {
      const copied = await copyToClipboard(buildValue(selection.text));
      status.textContent = copied
        ? successMessage
        : "コピーできませんでした。テキストを選び直してください。";
      // The fallback path may have hidden the popover; keep it visible.
      active = selection;
      popover.hidden = false;
      positionPopover(popover, selection.rect);
    } finally {
      // Runs after the queued `selectionchange` events of the fallback path.
      window.setTimeout(() => {
        isCopying = false;
      }, 0);
    }
  };

  linkButton.addEventListener("click", () => {
    void copy(
      (selection) => buildTextFragmentUrl(resolvePageUrl(), selection),
      "リンクをコピーしました",
    );
  });

  quoteButton.addEventListener("click", () => {
    void copy(
      (selection) =>
        buildQuoteMarkdown({
          url: resolvePageUrl(),
          title: document.title,
          selection,
        }),
      "引用をコピーしました",
    );
  });

  // Keep the selection alive while the user presses a popover button.
  popover.addEventListener("mousedown", (event) => event.preventDefault());

  document.addEventListener("selectionchange", refresh);
  document.addEventListener("mouseup", refresh);
  document.addEventListener("keyup", refresh);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !popover.hidden) {
      event.preventDefault();
      hide();
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (popover.hidden) return;
    if (event.target instanceof Node && popover.contains(event.target)) return;
    hide();
  });

  window.addEventListener("scroll", hide, { passive: true });
}

function createButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rr-text-fragment__button";
  button.textContent = label;
  return button;
}

function readShareableSelection(): ActiveSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const text = selection.toString().trim();
  if (text.length === 0) return null;

  const range = selection.getRangeAt(0);
  if (
    !isShareableNode(range.startContainer) ||
    !isShareableNode(range.endContainer)
  ) {
    return null;
  }

  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  return { text, rect };
}

function isShareableNode(node: Node): boolean {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;

  if (!element) return false;
  if (element.closest(EXCLUDED_SELECTOR)) return false;

  return element.closest(ARTICLE_SELECTOR) !== null;
}

function positionPopover(popover: HTMLElement, rect: DOMRect): void {
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;

  let left = rect.left + rect.width / 2 - width / 2;
  let top = rect.top - height - POPOVER_GAP;

  if (top < POPOVER_GAP) top = rect.bottom + POPOVER_GAP;

  left = Math.max(
    POPOVER_GAP,
    Math.min(left, window.innerWidth - width - POPOVER_GAP),
  );

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

function resolvePageUrl(): string {
  return window.location.href.split("#")[0] ?? window.location.href;
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

    // Restore the reader's selection so the highlight does not vanish.
    if (selection && savedRanges.length > 0) {
      selection.removeAllRanges();
      for (const range of savedRanges) selection.addRange(range);
    }
  }

  return copied;
}
