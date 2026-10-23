const SCROLL_RECORD_DELAY_MS = 100;

export class ScrollRestoration {
  private readonly previous: ScrollRestorationRestore;
  private readonly enabled: boolean;
  private timer?: number;

  constructor(enabled: boolean) {
    this.enabled = enabled;
    this.previous = history.scrollRestoration;
  }

  start(): void {
    if (!this.enabled) return;
    history.scrollRestoration = "manual";
    window.addEventListener("scroll", this.onScroll, { passive: true });
  }

  stop(): void {
    if (!this.enabled) return;
    this.cancel();
    window.removeEventListener("scroll", this.onScroll);
    history.scrollRestoration = this.previous;
  }

  cancel(): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = undefined;
  }

  record(): void {
    if (!this.enabled) return;
    this.cancel();
    history.replaceState(
      {
        ...(history.state ?? {}),
        scroll: [window.scrollX, window.scrollY],
      },
      "",
    );
  }

  push(url: URL): void {
    if (this.enabled) this.cancel();
    history.pushState({ scroll: [0, 0] }, "", url);
  }

  restore(url: URL, popstate: boolean): void {
    if (!this.enabled) return;
    this.cancel();
    if (url.hash) {
      document.getElementById(readHashId(url.hash))?.scrollIntoView();
      return;
    }
    const saved = popstate ? readSavedScrollPosition(history.state) : undefined;
    if (saved) {
      window.scrollTo(saved[0], saved[1]);
      return;
    }
    if (!popstate) window.scrollTo(0, 0);
  }

  private readonly onScroll = (): void => {
    if (this.timer !== undefined) return;
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      this.record();
    }, SCROLL_RECORD_DELAY_MS);
  };
}

type ScrollRestorationRestore = "auto" | "manual";

function readHashId(hash: string): string {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return "";
  }
}

function readSavedScrollPosition(value: unknown): [number, number] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const scroll = (value as { scroll?: unknown }).scroll;
  if (!Array.isArray(scroll) || scroll.length !== 2) return undefined;
  return typeof scroll[0] === "number" && typeof scroll[1] === "number"
    ? [scroll[0], scroll[1]]
    : undefined;
}
