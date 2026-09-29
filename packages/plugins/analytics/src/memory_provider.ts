import type { AnalyticsEvent, AnalyticsPageViewEvent } from "./event.js";
import {
  ANALYTICS_CAPABILITIES,
  type AnalyticsProvider,
  assertAnalyticsQuerySupported,
} from "./provider.js";
import type {
  AnalyticsQuery,
  AnalyticsResult,
  PopularContentItem,
} from "./query.js";

/** In-memory provider for tests, local experiments, and provider contract examples. */
export class MemoryAnalyticsProvider implements AnalyticsProvider {
  readonly capabilities = new Set(ANALYTICS_CAPABILITIES);
  readonly #events: AnalyticsEvent[];

  constructor(initialEvents: readonly AnalyticsEvent[] = []) {
    this.#events = [...initialEvents];
  }

  async capture(event: AnalyticsEvent): Promise<void> {
    this.#events.push(event);
  }

  async query(query: AnalyticsQuery): Promise<AnalyticsResult> {
    assertAnalyticsQuerySupported(this, query);
    const pageViews = this.#events
      .filter(isPageView)
      .filter((event) => isInTimeRange(event.occurredAt, query.timeRange));

    if (query.type === "content_page_views") {
      return {
        type: query.type,
        contentId: query.contentId,
        pageViews: pageViews.filter(
          (event) => event.contentId === query.contentId,
        ).length,
      };
    }

    const counts = new Map<string, number>();
    for (const event of pageViews) {
      counts.set(event.contentId, (counts.get(event.contentId) ?? 0) + 1);
    }
    const items: PopularContentItem[] = [...counts.entries()]
      .map(([contentId, pageViews]) => ({ contentId, pageViews }))
      .sort(
        (left, right) =>
          right.pageViews - left.pageViews ||
          left.contentId.localeCompare(right.contentId),
      )
      .slice(0, query.limit ?? 10);
    return { type: query.type, items };
  }
}

function isPageView(event: AnalyticsEvent): event is AnalyticsPageViewEvent {
  return event.type === "page_view";
}

function isInTimeRange(
  occurredAt: string,
  timeRange: { from?: string; to?: string } | undefined,
): boolean {
  if (!timeRange) return true;
  return (
    (timeRange.from === undefined || occurredAt >= timeRange.from) &&
    (timeRange.to === undefined || occurredAt <= timeRange.to)
  );
}
