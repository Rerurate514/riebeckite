import type { HoverPreviewEntry, HoverPreviewIndex } from "./types.js";

const DEFAULT_SELECTOR = 'a[href^="/"]';
const DEFAULT_CLASS_NAME = "rb-hover-preview";
const DEFAULT_DELAY = 120;
const GAP = 8;
const MARGIN = 8;

type ResolvedClientConfig = {
  selector: string;
  className: string;
  includeTitles: boolean;
  delay: number;
};

export function initHoverPreview(): () => void {
  if (typeof document === "undefined") return () => {};

  const root = document.documentElement;
  if (root.dataset.hoverPreviewInit === "true") return () => {};

  const payload = document.querySelector<HTMLScriptElement>(
    "script[data-rb-hover-preview]",
  );
  if (!payload) return () => {};

  const index = parsePayload(payload.textContent);
  if (!index) return () => {};

  const config: ResolvedClientConfig = {
    selector: normalizeSelector(payload.dataset.selector),
    className: normalizeClassName(payload.dataset.className),
    includeTitles: payload.dataset.includeTitles !== "false",
    delay: normalizeDelay(payload.dataset.delay),
  };

  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(config.selector),
  );
  if (anchors.length === 0) return () => {};

  root.dataset.hoverPreviewInit = "true";

  const popover = document.createElement("div");
  popover.className = config.className;
  popover.setAttribute("data-hover-preview", "");
  popover.setAttribute("role", "tooltip");
  popover.hidden = true;
  document.body.appendChild(popover);

  let showTimer = 0;
  let activeAnchor: HTMLAnchorElement | null = null;

  const hide = () => {
    window.clearTimeout(showTimer);
    showTimer = 0;
    activeAnchor = null;
    popover.hidden = true;
  };

  const show = (anchor: HTMLAnchorElement) => {
    window.clearTimeout(showTimer);
    showTimer = 0;
    const entry = resolveEntry(index, anchor.getAttribute("href"));
    if (!entry) return;

    renderPopover(popover, entry, config);
    popover.hidden = false;
    positionPopover(popover, anchor);
    activeAnchor = anchor;
  };

  const schedule = (anchor: HTMLAnchorElement, delay: number) => {
    window.clearTimeout(showTimer);
    if (delay <= 0) {
      show(anchor);
      return;
    }
    showTimer = window.setTimeout(() => show(anchor), delay);
  };

  const listeners: {
    target: EventTarget;
    type: string;
    handler: EventListener;
  }[] = [];

  const listen = (
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, handler, options);
    listeners.push({ target, type, handler });
  };

  for (const anchor of anchors) {
    listen(anchor, "mouseenter", () => schedule(anchor, config.delay));
    listen(anchor, "mouseleave", hide);
    listen(anchor, "focus", () => schedule(anchor, config.delay));
    listen(anchor, "blur", hide);
    listen(anchor, "touchstart", () => show(anchor), { passive: true });
  }

  listen(document, "scroll", hide, { passive: true, capture: true });
  listen(document, "touchstart", (event) => {
    const target = event.target;
    if (
      activeAnchor &&
      target instanceof Node &&
      activeAnchor.contains(target)
    ) {
      return;
    }
    if (target instanceof Node && popover.contains(target)) return;
    hide();
  });
  listen(document, "keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape") hide();
  });

  return () => {
    hide();
    for (const { target, type, handler } of listeners) {
      target.removeEventListener(type, handler);
    }
    listeners.length = 0;
    popover.remove();
    delete root.dataset.hoverPreviewInit;
  };
}

function parsePayload(text: string | null): HoverPreviewIndex | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as HoverPreviewIndex;
  } catch {
    return null;
  }
}

function resolveEntry(
  index: HoverPreviewIndex,
  href: string | null,
): HoverPreviewEntry | null {
  if (!href) return null;

  const withoutFragment = href.split("#")[0] ?? href;
  const clean = withoutFragment.split("?")[0] ?? withoutFragment;
  const candidates = new Set<string>([href, clean]);
  if (clean.endsWith("/")) {
    candidates.add(clean.slice(0, -1));
  } else {
    candidates.add(`${clean}/`);
  }
  try {
    candidates.add(decodeURI(clean));
  } catch {
    // Keep the original candidates when the href is not valid URI text.
  }

  for (const candidate of candidates) {
    const entry = index[candidate];
    if (entry) return entry;
  }
  return null;
}

function renderPopover(
  popover: HTMLElement,
  entry: HoverPreviewEntry,
  config: ResolvedClientConfig,
): void {
  popover.replaceChildren();

  if (config.includeTitles && entry.title) {
    const title = document.createElement("p");
    title.className = `${config.className}__title`;
    title.textContent = entry.title;
    popover.appendChild(title);
  }

  if (entry.excerpt) {
    const excerpt = document.createElement("p");
    excerpt.className = `${config.className}__excerpt`;
    excerpt.textContent = entry.excerpt;
    popover.appendChild(excerpt);
  }
}

function positionPopover(popover: HTMLElement, anchor: HTMLElement): void {
  const anchorRect = anchor.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();

  let top = anchorRect.bottom + GAP;
  if (
    top + popoverRect.height > window.innerHeight - MARGIN &&
    anchorRect.top - GAP - popoverRect.height >= MARGIN
  ) {
    top = anchorRect.top - GAP - popoverRect.height;
  }

  const maxLeft = window.innerWidth - popoverRect.width - MARGIN;
  const left = Math.min(
    Math.max(anchorRect.left, MARGIN),
    Math.max(maxLeft, MARGIN),
  );

  popover.style.top = `${Math.round(top)}px`;
  popover.style.left = `${Math.round(left)}px`;
}

function normalizeSelector(value: string | undefined): string {
  return value && value.trim() !== "" ? value.trim() : DEFAULT_SELECTOR;
}

function normalizeClassName(value: string | undefined): string {
  return value && value.trim() !== "" ? value.trim() : DEFAULT_CLASS_NAME;
}

function normalizeDelay(value: string | undefined): number {
  const delay = Number(value ?? DEFAULT_DELAY);
  return Number.isFinite(delay) && delay >= 0 ? delay : DEFAULT_DELAY;
}
