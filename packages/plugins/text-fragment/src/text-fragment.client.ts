import { copyText } from "@riebeckite/ui/copy";
import { mountTextFragmentPopover } from "./popover.js";
import { buildQuoteMarkdown, buildTextFragmentUrl } from "./text-fragment.js";

/** Article body container emitted by the Honox article primitives. */
const ARTICLE_SELECTOR = ".rb-article-body";

/** Regions a text fragment link makes no sense for. */
const EXCLUDED_SELECTOR = "pre, code, a[href], [data-no-share]";

const POPOVER_GAP = 8;

export type TextFragmentLabels = {
  regionLabel: string;
  copyLinkLabel: string;
  copyQuoteLabel: string;
  linkCopiedLabel: string;
  quoteCopiedLabel: string;
  copyFailedLabel: string;
};

export const DEFAULT_TEXT_FRAGMENT_LABELS: TextFragmentLabels = {
  regionLabel: "Share selected text",
  copyLinkLabel: "Copy link",
  copyQuoteLabel: "Copy quote",
  linkCopiedLabel: "Link copied",
  quoteCopiedLabel: "Quote copied",
  copyFailedLabel: "Could not copy. Select the text again.",
};

let initialized = false;

type ActiveSelection = {
  readonly text: string;
  readonly rect: DOMRect;
};

/**
 * Enables a popover with copy-link (Text Fragment deep link) and copy-quote
 * (Markdown quote) actions for the current text selection.
 *
 * Client-only: returns immediately when there is no `document`, and only wires
 * its listeners once per page.
 */
export function initTextFragmentShare(
  labels: Partial<TextFragmentLabels> = {},
): (() => void) | undefined {
  if (typeof document === "undefined") return;
  if (initialized) return;
  initialized = true;

  const resolved = { ...DEFAULT_TEXT_FRAGMENT_LABELS, ...labels };

  const host = document.createElement("div");
  document.body.appendChild(host);
  const view = mountTextFragmentPopover(host, {
    labels: resolved,
    onCopyLink: () => {
      onLinkButtonClick();
    },
    onCopyQuote: () => {
      onQuoteButtonClick();
    },
  });
  const popover = host.querySelector<HTMLElement>(".rr-text-fragment");
  if (!popover) throw new Error("Failed to create the text fragment popover.");

  let active: ActiveSelection | null = null;
  let visible = false;
  let statusText = "";
  const copyingTimers = new Set<number>();
  // The `execCommand` fallback moves the DOM selection, which fires
  // `selectionchange`. Ignore those events until the copy has settled.
  let isCopying = false;

  const render = () => {
    view.render({ visible, status: statusText });
  };

  const position = () => {
    requestAnimationFrame(() => {
      if (!visible || !active) return;
      positionPopover(popover, active.rect);
    });
  };

  const hide = () => {
    active = null;
    visible = false;
    statusText = "";
    render();
  };

  const show = (selection: ActiveSelection, resetStatus: boolean) => {
    active = selection;
    if (resetStatus) statusText = "";
    visible = true;
    render();
    position();
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
      const copied = await copyText(buildValue(selection.text));
      statusText = copied ? successMessage : resolved.copyFailedLabel;
      // The fallback path may have hidden the popover; keep it visible.
      active = selection;
      visible = true;
      render();
      position();
    } finally {
      // Runs after the queued `selectionchange` events of the fallback path.
      const timer = window.setTimeout(() => {
        copyingTimers.delete(timer);
        isCopying = false;
      }, 0);
      copyingTimers.add(timer);
    }
  };

  const onLinkButtonClick = () => {
    void copy(
      (selection) => buildTextFragmentUrl(resolvePageUrl(), selection),
      resolved.linkCopiedLabel,
    );
  };

  const onQuoteButtonClick = () => {
    void copy(
      (selection) =>
        buildQuoteMarkdown({
          url: resolvePageUrl(),
          title: document.title,
          selection,
        }),
      resolved.quoteCopiedLabel,
    );
  };

  // Keep the selection alive while the user presses a popover button.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && visible) {
      event.preventDefault();
      hide();
    }
  };
  const onMouseDown = (event: MouseEvent) => {
    if (!visible) return;
    if (event.target instanceof Node && popover.contains(event.target)) return;
    hide();
  };

  document.addEventListener("selectionchange", refresh);
  document.addEventListener("mouseup", refresh);
  document.addEventListener("keyup", refresh);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("mousedown", onMouseDown);
  window.addEventListener("scroll", hide, { passive: true });
  return () => {
    initialized = false;
    for (const timer of copyingTimers) window.clearTimeout(timer);
    copyingTimers.clear();
    document.removeEventListener("selectionchange", refresh);
    document.removeEventListener("mouseup", refresh);
    document.removeEventListener("keyup", refresh);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("scroll", hide);
    view.unmount();
    host.remove();
  };
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
