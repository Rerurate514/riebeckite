export type SpaOptions = {
  prefetch?: false | "hover";
  scrollRestoration?: boolean;
  viewTransitions?: boolean;
};

export type SpaPageCommit = (context: {
  root: HTMLElement;
  signal: AbortSignal;
}) => void | Promise<void>;

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
    document.addEventListener("click", this.onClick);
    window.addEventListener("popstate", this.onPopState);
    if (this.options.prefetch === "hover") {
      document.addEventListener("pointerover", this.onPointerOver);
    }
    return () => this.stop();
  }

  private stop(): void {
    this.active?.abort();
    document.removeEventListener("click", this.onClick);
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("pointerover", this.onPointerOver);
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
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
    const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
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
    return url.origin === window.location.origin && url.protocol === window.location.protocol;
  }

  private async navigate(url: URL, popstate: boolean): Promise<void> {
    const controller = new AbortController();
    this.active?.abort();
    this.active = controller;
    try {
      const fetched = await this.fetchPage(url, controller.signal);
      if (controller.signal.aborted) return;
      const page = new DOMParser().parseFromString(fetched.html, "text/html");
      const replacement = page.querySelector<HTMLElement>("main#main-content");
      const current = document.querySelector<HTMLElement>("main#main-content");
      if (!replacement || !current) {
        window.location.assign(url.href);
        return;
      }
      const finalUrl = new URL(fetched.url, url.href);
      const commit = async () => {
        await this.options.onBeforePageCommit?.(controller.signal);
        if (controller.signal.aborted) return;
        current.replaceWith(replacement);
        document.title = page.title;
        await this.options.onPageCommit?.({ root: replacement, signal: controller.signal });
      };
      if (this.shouldUseViewTransition()) {
        await document.startViewTransition(commit).finished;
      } else {
        await commit();
      }
      if (controller.signal.aborted) return;
      if (!popstate) history.pushState(null, "", finalUrl);
      this.restorePosition(finalUrl, popstate);
      replacement.focus({ preventScroll: true });
      announceNavigation();
    } catch (error) {
      if (controller.signal.aborted) return;
      window.location.assign(url.href);
    } finally {
      if (this.active === controller) this.active = undefined;
    }
  }

  private async prefetch(url: URL): Promise<void> {
    if (this.cache.size >= 20 || this.cache.has(url.href)) return;
    this.cache.set(url.href, this.fetchPage(url, new AbortController().signal));
  }

  private async fetchPage(url: URL, signal: AbortSignal): Promise<FetchedPage> {
    const cached = this.cache.get(url.href);
    if (cached) return cached;
    const response = await fetch(url, {
      headers: { Accept: "text/html" },
      signal,
    });
    if (!response.ok) throw new Error(`Navigation request failed: ${response.status}`);
    return { html: await response.text(), url: response.url };
  }

  private restorePosition(url: URL, popstate: boolean): void {
    if (!this.options.scrollRestoration) return;
    if (url.hash) {
      document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
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

function validateSpaOptions(options: SpaOptions): void {
  if (options.prefetch !== undefined && options.prefetch !== false && options.prefetch !== "hover") {
    throw new TypeError('SPA prefetch must be false or "hover".');
  }
  if (options.scrollRestoration !== undefined && typeof options.scrollRestoration !== "boolean") {
    throw new TypeError("SPA scrollRestoration must be a boolean.");
  }
  if (options.viewTransitions !== undefined && typeof options.viewTransitions !== "boolean") {
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
  const announcer = document.getElementById("riebeckite-navigation-announcer");
  if (announcer) announcer.textContent = document.title;
}
