import {
  announceNavigation,
  focusHashTarget,
  focusPage,
  reconcileDocument,
} from "./document.js";
import {
  type SpaNavigationEventDetail,
  type SpaNavigationOptions,
  type SpaOptions,
  validateSpaOptions,
} from "./options.js";
import { PageCache } from "./prefetch.js";
import { ScrollRestoration } from "./scroll.js";

type Navigation = {
  id: number;
  controller: AbortController;
  transition?: SkippableTransition;
};

type LoadedPage = {
  document: Document;
  root: HTMLElement;
  url: URL;
};

type SkippableTransition = {
  finished: Promise<void>;
  skipTransition(): void;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => Promise<void>) => SkippableTransition;
};

export function startSpaNavigation(
  options: SpaNavigationOptions = {},
): () => void {
  return new SpaNavigation(options).start();
}

class SpaNavigation {
  private readonly options: Required<SpaOptions> &
    Pick<SpaNavigationOptions, "onBeforePageCommit" | "onPageCommit">;
  private readonly cache = new PageCache();
  private readonly scroll: ScrollRestoration;
  private navigationId = 0;
  private currentPath = window.location.pathname + window.location.search;
  private active?: Navigation;

  constructor(options: SpaNavigationOptions) {
    validateSpaOptions(options);
    this.options = {
      prefetch: options.prefetch ?? false,
      scrollRestoration: options.scrollRestoration ?? true,
      viewTransitions: options.viewTransitions ?? false,
      onBeforePageCommit: options.onBeforePageCommit,
      onPageCommit: options.onPageCommit,
    };
    this.scroll = new ScrollRestoration(this.options.scrollRestoration);
  }

  start(): () => void {
    this.scroll.start();
    document.addEventListener("click", this.onClick);
    window.addEventListener("popstate", this.onPopState);
    if (this.options.prefetch === "hover") {
      document.addEventListener("pointerover", this.onPointerOver);
    }
    return () => this.stop();
  }

  private stop(): void {
    this.navigationId += 1;
    this.cancelActive();
    this.cache.dispose();
    this.scroll.stop();
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
    this.cache.prefetch(url);
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
    const id = ++this.navigationId;
    this.cancelActive();
    if (popstate && this.isSamePage(url)) {
      this.scroll.restore(url, true);
      if (url.hash) {
        focusHashTarget(url);
      } else {
        const root = document.querySelector<HTMLElement>("main#main-content");
        if (root) focusPage(root, url);
      }
      return;
    }
    const controller = new AbortController();
    const active: Navigation = { id, controller };
    this.active = active;
    let committed = false;

    try {
      if (!popstate) this.scroll.record();
      const page = await this.loadPage(url, controller.signal);
      if (!this.isCurrent(id, controller)) return;

      const current = document.querySelector<HTMLElement>("main#main-content");
      if (!current) throw new Error("SPA page root is missing.");

      const commit = async (): Promise<void> => {
        if (!this.isCurrent(id, controller)) return;
        await this.options.onBeforePageCommit?.(controller.signal);
        if (!this.isCurrent(id, controller)) return;
        reconcileDocument(page.document);
        current.replaceWith(page.root);
        committed = true;
        await this.options.onPageCommit?.({
          root: page.root,
          signal: controller.signal,
        });
      };

      if (this.shouldUseViewTransition()) {
        const startViewTransition = (
          document as ViewTransitionDocument
        ).startViewTransition?.bind(document);
        if (startViewTransition) {
          const transition = startViewTransition(commit);
          active.transition = transition;
          await transition.finished;
        } else {
          await commit();
        }
      } else {
        await commit();
      }

      if (!this.isCurrent(id, controller)) return;
      if (!popstate) this.scroll.push(page.url);
      this.scroll.restore(page.url, popstate);
      focusPage(page.root, page.url);
      focusHashTarget(page.url);
      announceNavigation();
      document.dispatchEvent(
        new CustomEvent<SpaNavigationEventDetail>("riebeckite:navigation", {
          detail: { url: page.url.href, popstate },
        }),
      );
      this.currentPath = page.url.pathname + page.url.search;
    } catch (error) {
      if (!this.isCurrent(id, controller)) return;
      if (committed) {
        console.error("[riebeckite] SPA navigation commit failed.", error);
        return;
      }
      window.location.assign(url.href);
    } finally {
      if (this.active === active) this.active = undefined;
    }
  }

  private async loadPage(
    url: URL,
    signal: AbortSignal,
  ): Promise<LoadedPage> {
    const fetched = await this.cache.get(url, signal);
    const page = new DOMParser().parseFromString(fetched.html, "text/html");
    const root = page.querySelector<HTMLElement>("main#main-content");
    if (!root) throw new Error("SPA page root is missing.");
    const finalUrl = new URL(fetched.url, url.href);
    if (finalUrl.origin !== window.location.origin) {
      throw new Error("SPA navigation redirected to another origin.");
    }
    return { document: page, root, url: finalUrl };
  }

  private cancelActive(): void {
    this.active?.controller.abort();
    this.active?.transition?.skipTransition();
    this.active = undefined;
  }

  private isCurrent(id: number, controller: AbortController): boolean {
    return this.navigationId === id && !controller.signal.aborted;
  }

  private isSamePage(url: URL): boolean {
    return url.pathname + url.search === this.currentPath;
  }

  private shouldUseViewTransition(): boolean {
    return (
      this.options.viewTransitions &&
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
}

function isHashOnlyNavigation(url: URL): boolean {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash.length > 0
  );
}
