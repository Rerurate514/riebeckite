import {
  DEFAULT_UX_CONFIG,
  UX_CONFIG_ELEMENT_ID,
  type UxResolvedConfig,
} from "./options.js";

const PROGRESS_CLASS = "rb-ux__progress";
const PROGRESS_BAR_CLASS = "rb-ux__progress-bar";
const BACK_TO_TOP_CLASS = "rb-ux__back-to-top";
const BACK_TO_TOP_VISIBLE_CLASS = "rb-ux__back-to-top--visible";
const TOC_ACTIVE_CLASS = "rb-ux__toc-active";
const CODE_CLASS = "rb-ux__code";
const COPY_CLASS = "rb-ux__copy";
const COPY_COPIED_CLASS = "rb-ux__copy--copied";

const BACK_TO_TOP_THRESHOLD = 320;
const COPIED_STATE_DURATION = 1500;

let started = false;
const copiedTimers = new WeakMap<HTMLButtonElement, number>();

/**
 * Initializes every enabled UX enhancement. Safe to call more than once and a
 * no-op when the relevant DOM elements are absent.
 */
export function initUx(): void {
  if (started) return;
  started = true;

  const config = readUxConfig();
  const run = () => {
    if (config.progress) setupProgress();
    if (config.backToTop) setupBackToTop(config);
    if (config.tocScrollSpy) setupTocScrollSpy();
    if (config.codeCopy) setupCodeCopy(config);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

/** Reads the injected JSON config element, falling back to defaults. */
function readUxConfig(): UxResolvedConfig {
  const element = document.getElementById(UX_CONFIG_ELEMENT_ID);
  const parsed = parseConfig(element?.textContent ?? null);
  if (!parsed) return { ...DEFAULT_UX_CONFIG };

  return {
    progress: readBoolean(parsed.progress, DEFAULT_UX_CONFIG.progress),
    backToTop: readBoolean(parsed.backToTop, DEFAULT_UX_CONFIG.backToTop),
    tocScrollSpy: readBoolean(
      parsed.tocScrollSpy,
      DEFAULT_UX_CONFIG.tocScrollSpy,
    ),
    codeCopy: readBoolean(parsed.codeCopy, DEFAULT_UX_CONFIG.codeCopy),
    backToTopLabel: readString(
      parsed.backToTopLabel,
      DEFAULT_UX_CONFIG.backToTopLabel,
    ),
    copyLabel: readString(parsed.copyLabel, DEFAULT_UX_CONFIG.copyLabel),
    copiedLabel: readString(parsed.copiedLabel, DEFAULT_UX_CONFIG.copiedLabel),
  };
}

function parseConfig(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

/** A fixed top bar that fills as the article is scrolled. */
function setupProgress(): void {
  const article = findArticle();
  if (!article || hasElement(PROGRESS_CLASS)) return;

  const track = document.createElement("div");
  track.className = PROGRESS_CLASS;
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-label", "Reading progress");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", "100");

  const fill = document.createElement("span");
  fill.className = PROGRESS_BAR_CLASS;
  track.append(fill);
  document.body.append(track);

  const update = () => {
    const ratio = readingProgress(article);
    fill.style.transform = `scaleX(${ratio})`;
    track.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
  };

  scheduleOnScroll(update);
}

function readingProgress(article: HTMLElement): number {
  const top = article.getBoundingClientRect().top + window.scrollY;
  const end = top + article.offsetHeight - window.innerHeight;
  if (end <= top) return window.scrollY >= top ? 1 : 0;
  return clamp((window.scrollY - top) / (end - top), 0, 1);
}

/** A button that appears after scrolling and returns to the top. */
function setupBackToTop(config: UxResolvedConfig): void {
  if (hasElement(BACK_TO_TOP_CLASS)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = BACK_TO_TOP_CLASS;
  button.setAttribute("aria-label", config.backToTopLabel);
  button.textContent = "\u2191";
  button.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  });
  document.body.append(button);

  const threshold = () =>
    Math.max(BACK_TO_TOP_THRESHOLD, window.innerHeight * 0.5);
  const update = () => {
    button.classList.toggle(
      BACK_TO_TOP_VISIBLE_CLASS,
      window.scrollY >= threshold(),
    );
  };

  scheduleOnScroll(update);
}

/** Highlights the table-of-contents link for the heading in view. */
function setupTocScrollSpy(): void {
  const container = document.querySelector<HTMLElement>(
    ".rr-table-of-contents, .table-of-contents, [data-rb-toc]",
  );
  if (!container || container.dataset.rbUxToc === "true") return;

  const links = Array.from(
    container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'),
  );
  if (links.length === 0) return;

  const linksById = new Map<string, HTMLAnchorElement[]>();
  for (const link of links) {
    const id = hashToId(link.getAttribute("href"));
    if (!id) continue;
    const existing = linksById.get(id) ?? [];
    existing.push(link);
    linksById.set(id, existing);
  }

  const headings = Array.from(linksById.keys())
    .map((id) => document.getElementById(id))
    .filter((heading): heading is HTMLElement => heading !== null);
  if (headings.length === 0) return;

  container.dataset.rbUxToc = "true";

  const activate = (id: string) => {
    for (const link of links) {
      link.classList.remove(TOC_ACTIVE_CLASS);
      link.removeAttribute("aria-current");
    }
    for (const link of linksById.get(id) ?? []) {
      link.classList.add(TOC_ACTIVE_CLASS);
      link.setAttribute("aria-current", "true");
    }
  };

  const visible = new Map<string, number>();
  let activeId: string | null = null;

  const updateActive = () => {
    let nextId: string | null = null;
    if (visible.size > 0) {
      let bestTop = Number.POSITIVE_INFINITY;
      for (const [id, top] of visible) {
        if (top < bestTop) {
          bestTop = top;
          nextId = id;
        }
      }
    } else {
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= 0) nextId = heading.id;
      }
    }

    nextId ??= headings[0]?.id ?? null;
    if (nextId && nextId !== activeId) {
      activeId = nextId;
      activate(nextId);
    }
  };

  if (typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) continue;
          if (entry.isIntersecting) {
            visible.set(id, entry.boundingClientRect.top);
          } else {
            visible.delete(id);
          }
        }
        updateActive();
      },
      { rootMargin: "-10% 0px -60% 0px", threshold: [0, 1] },
    );
    for (const heading of headings) observer.observe(heading);
  }

  scheduleOnScroll(updateActive);
}

/** Adds a copy button to each code block that lacks one. */
function setupCodeCopy(config: UxResolvedConfig): void {
  const blocks = Array.from(
    document.querySelectorAll<HTMLElement>("pre > code"),
  );
  for (const code of blocks) {
    const pre = code.parentElement;
    if (!pre || pre.dataset.rbUxCopy === "true") continue;
    // Code blocks owned by a framework with its own copy affordance are left
    // untouched so the two plugins do not render duplicate buttons.
    if (pre.closest(".rr-code")) continue;

    pre.dataset.rbUxCopy = "true";

    const wrapper = document.createElement("div");
    wrapper.className = CODE_CLASS;
    pre.replaceWith(wrapper);
    wrapper.append(pre);

    const button = document.createElement("button");
    button.type = "button";
    button.className = COPY_CLASS;
    button.setAttribute("aria-label", config.copyLabel);
    button.textContent = config.copyLabel;
    button.addEventListener("click", () => {
      void copyCode(button, code, config);
    });
    wrapper.append(button);
  }
}

async function copyCode(
  button: HTMLButtonElement,
  code: HTMLElement,
  config: UxResolvedConfig,
): Promise<void> {
  const text = code.textContent ?? "";
  const clipboard = navigator.clipboard;
  if (text.length === 0 || !clipboard) return;

  try {
    await clipboard.writeText(text);
  } catch {
    return;
  }
  showCopiedState(button, config);
}

function showCopiedState(
  button: HTMLButtonElement,
  config: UxResolvedConfig,
): void {
  const previous = copiedTimers.get(button);
  if (previous !== undefined) window.clearTimeout(previous);

  button.textContent = config.copiedLabel;
  button.classList.add(COPY_COPIED_CLASS);
  const timer = window.setTimeout(() => {
    button.textContent = config.copyLabel;
    button.classList.remove(COPY_COPIED_CLASS);
    copiedTimers.delete(button);
  }, COPIED_STATE_DURATION);
  copiedTimers.set(button, timer);
}

function findArticle(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    ".rb-article-body, .article-shell__body, [data-slot='article-body'], article",
  );
}

function hasElement(className: string): boolean {
  return document.querySelector(`.${className}`) !== null;
}

function hashToId(href: string | null): string | null {
  if (typeof href !== "string" || href.length < 2) return null;
  if (!href.startsWith("#")) return null;
  const raw = href.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Runs `update` immediately and on scroll/resize, coalesced per frame. */
function scheduleOnScroll(update: () => void): void {
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  update();
}
