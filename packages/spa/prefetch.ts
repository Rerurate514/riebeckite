export type FetchedPage = {
  html: string;
  url: string;
};

export type PageFetcher = (
  url: URL,
  signal: AbortSignal,
) => Promise<FetchedPage>;

export type PageCacheOptions = {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
  canPrefetch?: () => boolean;
  fetcher?: PageFetcher;
};

type CacheEntry = {
  controller: AbortController;
  createdAt: number;
  settled: boolean;
  promise: Promise<FetchedPage>;
};

const DEFAULT_TTL_MS = 30_000;
const DEFAULT_MAX_ENTRIES = 20;
const FETCH_TIMEOUT_MS = 15_000;

export class PageCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;
  private readonly canPrefetch: () => boolean;
  private readonly fetcher: PageFetcher;

  constructor(options: PageCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.now = options.now ?? Date.now;
    this.canPrefetch = options.canPrefetch ?? allowsPrefetch;
    this.fetcher = options.fetcher ?? fetchPage;
  }

  get size(): number {
    return this.entries.size;
  }

  get(url: URL, signal?: AbortSignal): Promise<FetchedPage> {
    const href = cacheKey(url);
    const cached = this.freshEntry(href);
    if (cached) {
      this.touch(href, cached);
      return abortable(cached.promise, signal);
    }
    return abortable(this.load(href).promise, signal);
  }

  prefetch(url: URL): void {
    if (!this.canPrefetch()) return;
    const href = cacheKey(url);
    if (this.freshEntry(href)) return;
    void this.load(href).promise.catch(() => undefined);
  }

  dispose(): void {
    for (const entry of this.entries.values()) entry.controller.abort();
    this.entries.clear();
  }

  private load(href: string): CacheEntry {
    if (this.entries.size >= this.maxEntries) this.evictOldest();
    const controller = new AbortController();
    let entry: CacheEntry;
    let fetched: Promise<FetchedPage>;
    try {
      fetched = this.fetcher(new URL(href), controller.signal);
    } catch (error) {
      fetched = Promise.reject(error);
    }
    const promise = fetched
      .then((page) => {
        entry.settled = true;
        entry.createdAt = this.now();
        this.evictOverflow();
        return page;
      })
      .catch((error: unknown) => {
        if (this.entries.get(href) === entry) this.entries.delete(href);
        throw error;
      });
    entry = {
      controller,
      createdAt: this.now(),
      settled: false,
      promise,
    };
    this.entries.set(href, entry);
    return entry;
  }

  private freshEntry(href: string): CacheEntry | undefined {
    const entry = this.entries.get(href);
    if (!entry) return undefined;
    if (entry.settled && this.now() - entry.createdAt > this.ttlMs) {
      this.entries.delete(href);
      entry.controller.abort();
      return undefined;
    }
    return entry;
  }

  private touch(href: string, entry: CacheEntry): void {
    this.entries.delete(href);
    this.entries.set(href, entry);
  }

  private evictOldest(): void {
    for (const [href, entry] of this.entries) {
      if (!entry.settled) continue;
      this.entries.delete(href);
      return;
    }
  }

  private evictOverflow(): void {
    while (this.entries.size > this.maxEntries) {
      const before = this.entries.size;
      this.evictOldest();
      if (this.entries.size === before) return;
    }
  }
}

export async function fetchPage(
  url: URL,
  signal: AbortSignal,
): Promise<FetchedPage> {
  const timeout = timeoutSignal(signal, FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/html,application/xhtml+xml" },
      signal: timeout.signal,
    });
    if (!response.ok) {
      throw new Error(`Navigation request failed: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && !isHtmlContentType(contentType)) {
      throw new Error(`Navigation response is not HTML: ${contentType}`);
    }
    return { html: await response.text(), url: response.url || url.href };
  } finally {
    timeout.clear();
  }
}

function isHtmlContentType(value: string): boolean {
  const mediaType = value.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === "text/html" || mediaType === "application/xhtml+xml";
}

function cacheKey(url: URL): string {
  const key = new URL(url.href);
  key.hash = "";
  return key.href;
}

function allowsPrefetch(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return (
    connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g"
  );
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortReason(signal));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function timeoutSignal(
  signal: AbortSignal,
  timeoutMs: number,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const abort = () => controller.abort(abortReason(signal));
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Navigation timed out.", "TimeoutError"));
  }, timeoutMs);
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    },
  };
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("Navigation aborted.", "AbortError");
}
