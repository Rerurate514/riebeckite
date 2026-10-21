export type SpaOptions = {
  prefetch?: false | "hover";
  scrollRestoration?: boolean;
  viewTransitions?: boolean;
};

export type SpaPageCommit = (context: {
  root: HTMLElement;
  signal: AbortSignal;
}) => void | Promise<void>;

export type SpaNavigationEventDetail = {
  url: string;
  popstate: boolean;
};

export type SpaNavigationOptions = SpaOptions & {
  onBeforePageCommit?: (signal: AbortSignal) => void | Promise<void>;
  onPageCommit?: SpaPageCommit;
};

export function spa(options: SpaOptions = {}): Readonly<SpaOptions> {
  validateSpaOptions(options);
  return Object.freeze({ ...options });
}

export function startSpaNavigation(
  options: SpaNavigationOptions = {},
): () => void {
  return new SpaNavigation(options).start();
}

class SpaNavigation {
  private readonly options: Required<SpaOptions> &
    Pick<SpaNavigationOptions, "onBeforePageCommit" | "onPageCommit">;
  private active?: AbortController;
  private readonly cache = new Map<string, Promise<FetchedPage>>();
  private readonly previousScrollRestoration = history.scrollRestoration;

  constructor(options: SpaNavigationOptions) {
    validateSpaOptions(options);
    this.options = {
      prefetch: options.prefetch ?? false,
      scrollRestoration: options.scrollRestoration ?? true,
      viewTransitions: options.viewTransitions ?? false,
      onBeforePageCommit: options.onBeforePageCommit,
      onPageCommit: options.onPageCommit,
    };
  }

  start(): () => void {
    history.scrollRestoration = "manual";
    document.addEventListener("click", this.onClick);
    window.addEventListener("popstate", this.onPopState);
    if (this.options.prefetch === "hover") {
      document.addEventListener("pointerover", this.onPointerOver);
    }
    return () => this.stop();
  }

  private stop(): void {
    this.active?.abort();
    history.scrollRestoration = this.previousScrollRestoration;
    document.removeEventListener("click", this.onClick);
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("pointerover", this.onPointerOver);
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      "a[href]",
    );
    if (!anchor || !this.shouldNavigate(anchor)) return;
    const url = new URL(anchor.href, window.location.href);
    if (isHashOnlyNavigation(url)) return;
    event.preventDefault();
    void this.navigate(url, false);
  };

  private readonly onPopState = (): void => {
    void this.navigate(new URL(window.location.href), true);
  };

  private readonly onPointerOver = (event: PointerEvent): void => {
    const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      "a[href]",
    );
    if (!anchor || !this.shouldNavigate(anchor)) return;
    const url = new URL(anchor.href, window.location.href);
    if (isHashOnlyNavigation(url)) return;
    void this.prefetch(url);
  };

  private shouldNavigate(anchor: HTMLAnchorElement): boolean {
    if (anchor.target && anchor.target !== "_self") return false;
    if (anchor.hasAttribute("download")) return false;
    if (anchor.dataset.spa === "false") return false;
    const url = new URL(anchor.href, window.location.href);
    return (
      url.origin === window.location.origin &&
      url.protocol === window.location.protocol
    );
  }

  private async navigate(url: URL, popstate: boolean): Promise<void> {
    const controller = new AbortController();
    this.active?.abort();
    this.active = controller;
    try {
      this.saveScrollPosition();
      const fetched = await this.fetchPage(url, controller.signal);
      if (controller.signal.aborted) return;
      const page = new DOMParser().parseFromString(fetched.html, "text/html");
      const replacement = page.querySelector<HTMLElement>("main#main-content");
      const current = document.querySelector<HTMLElement>("main#main-content");
      if (!replacement || !current)
        throw new Error("SPA page root is missing.");
      const finalUrl = new URL(fetched.url, url.href);
      const commit = async () => {
        await this.options.onBeforePageCommit?.(controller.signal);
        if (controller.signal.aborted) return;
        reconcileDocument(page);
        current.replaceWith(replacement);
        await this.options.onPageCommit?.({
          root: replacement,
          signal: controller.signal,
        });
      };
      if (this.shouldUseViewTransition()) {
        await document.startViewTransition(commit).finished;
      } else {
        await commit();
      }
      if (controller.signal.aborted) return;
      if (!popstate) history.pushState({ scroll: [0, 0] }, "", finalUrl);
      this.restorePosition(finalUrl, popstate);
      focusPage(replacement, finalUrl);
      announceNavigation();
      document.dispatchEvent(
        new CustomEvent<SpaNavigationEventDetail>("riebeckite:navigation", {
          detail: { url: finalUrl.href, popstate },
        }),
      );
    } catch {
      if (controller.signal.aborted) return;
      window.location.assign(url.href);
    } finally {
      if (this.active === controller) this.active = undefined;
    }
  }

  private async prefetch(url: URL): Promise<void> {
    if (this.cache.size >= 20 || this.cache.has(url.href)) return;
    const request = this.fetchPage(url, new AbortController().signal);
    this.cache.set(url.href, request);
    try {
      await request;
    } catch {
      this.cache.delete(url.href);
    }
  }

  private async fetchPage(url: URL, signal: AbortSignal): Promise<FetchedPage> {
    const cached = this.cache.get(url.href);
    if (cached) return cached;
    const response = await fetch(url, {
      headers: { Accept: "text/html" },
      signal,
    });
    if (!response.ok)
      throw new Error(`Navigation request failed: ${response.status}`);
    return { html: await response.text(), url: response.url };
  }

  private saveScrollPosition(): void {
    if (!this.options.scrollRestoration) return;
    history.replaceState(
      { ...(history.state ?? {}), scroll: [window.scrollX, window.scrollY] },
      "",
    );
  }

  private restorePosition(url: URL, popstate: boolean): void {
    if (!this.options.scrollRestoration) return;
    if (url.hash) {
      document
        .getElementById(decodeURIComponent(url.hash.slice(1)))
        ?.scrollIntoView();
      return;
    }
    const saved = popstate ? readSavedScrollPosition(history.state) : undefined;
    if (saved) {
      window.scrollTo(saved[0], saved[1]);
      return;
    }
    if (!popstate) window.scrollTo(0, 0);
  }

  private shouldUseViewTransition(): boolean {
    return (
      this.options.viewTransitions &&
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
}

type FetchedPage = {
  html: string;
  url: string;
};

function reconcileDocument(page: Document): void {
  document.title = page.title;
  reconcilePageHead(page);
  const language = page.documentElement.getAttribute("lang");
  if (language) document.documentElement.lang = language;
  else document.documentElement.removeAttribute("lang");
  const direction = page.documentElement.getAttribute("dir");
  if (direction) document.documentElement.dir = direction;
  else document.documentElement.removeAttribute("dir");
}

function reconcilePageHead(page: Document): void {
  const nodes = Array.from(document.head.children).filter(isPageHeadNode);
  for (const node of nodes) node.remove();
  for (const node of Array.from(page.head.children).filter(isPageHeadNode)) {
    document.head.append(node.cloneNode(true));
  }
}

function isPageHeadNode(node: Element): boolean {
  if (node.matches('link[rel="canonical"], link[hreflang]')) return true;
  if (node.matches('script[type="application/ld+json"]')) return true;
  if (!node.matches("meta")) return false;
  const name = node.getAttribute("name");
  if (name && ["description", "author", "robots"].includes(name)) return true;
  if (name?.startsWith("twitter:")) return true;
  const property = node.getAttribute("property");
  return (
    property?.startsWith("og:") === true ||
    property?.startsWith("article:") === true
  );
}

function focusPage(root: HTMLElement, url: URL): void {
  if (url.hash) return;
  if (!root.hasAttribute("tabindex")) root.tabIndex = -1;
  root.focus({ preventScroll: true });
}

function readSavedScrollPosition(value: unknown): [number, number] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const scroll = (value as { scroll?: unknown }).scroll;
  if (!Array.isArray(scroll) || scroll.length !== 2) return undefined;
  return typeof scroll[0] === "number" && typeof scroll[1] === "number"
    ? [scroll[0], scroll[1]]
    : undefined;
}

function validateSpaOptions(options: SpaOptions): void {
  if (
    options.prefetch !== undefined &&
    options.prefetch !== false &&
    options.prefetch !== "hover"
  ) {
    throw new TypeError('SPA prefetch must be false or "hover".');
  }
  if (
    options.scrollRestoration !== undefined &&
    typeof options.scrollRestoration !== "boolean"
  ) {
    throw new TypeError("SPA scrollRestoration must be a boolean.");
  }
  if (
    options.viewTransitions !== undefined &&
    typeof options.viewTransitions !== "boolean"
  ) {
    throw new TypeError("SPA viewTransitions must be a boolean.");
  }
}

function isHashOnlyNavigation(url: URL): boolean {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash.length > 0
  );
}

function announceNavigation(): void {
  let announcer = document.getElementById("riebeckite-navigation-announcer");
  if (!announcer) {
    announcer = document.createElement("div");
    announcer.id = "riebeckite-navigation-announcer";
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    announcer.className = "riebeckite-visually-hidden";
    document.body.append(announcer);
  }
  announcer.textContent = document.title;
}
