import type {
  AnalyticsEvent,
  AnalyticsPageViewEvent,
  AnalyticsQuery,
  AnalyticsResult,
} from "@riebeckite/plugin-analytics";
import { UnsupportedAnalyticsQueryError } from "@riebeckite/plugin-analytics";
import type { AnalyticsStorage } from "../../domain/analytics/storage.js";

export interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

/**
 * Minimal KV capture storage. KV has no atomic increment or aggregate query;
 * its best-effort totals may lose concurrent writes and it intentionally does
 * not advertise read capabilities.
 */
export class KvAnalyticsStorage implements AnalyticsStorage {
  readonly capabilities = new Set(["capture"] as const);

  constructor(private readonly namespace: KvNamespace) {}

  async capture(event: AnalyticsEvent): Promise<void> {
    if (!isPageView(event)) return;
    const key = `analytics:page-view:${event.contentId}`;
    const existing = await this.namespace.get(key);
    const pageViews =
      Math.max(0, Number.parseInt(existing ?? "0", 10) || 0) + 1;
    await this.namespace.put(key, String(pageViews));
  }

  async query(query: AnalyticsQuery): Promise<AnalyticsResult> {
    throw new UnsupportedAnalyticsQueryError(query, query.type);
  }
}

/** Creates a KV-backed, capture-only analytics storage adapter from a binding. */
export function kvStorage(namespace: KvNamespace): AnalyticsStorage {
  return new KvAnalyticsStorage(namespace);
}

function isPageView(event: AnalyticsEvent): event is AnalyticsPageViewEvent {
  return event.type === "page_view";
}
