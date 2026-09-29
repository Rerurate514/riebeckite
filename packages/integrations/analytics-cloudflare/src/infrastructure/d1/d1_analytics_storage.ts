import type {
  AnalyticsEvent,
  AnalyticsPageViewEvent,
  AnalyticsQuery,
  AnalyticsResult,
  PopularContentItem,
} from "@riebeckite/plugin-analytics";
import { assertAnalyticsQuerySupported } from "@riebeckite/plugin-analytics";
import type { AnalyticsStorage } from "../../domain/analytics/storage.js";
import type { D1Database } from "./d1_types.js";

type CountRow = Readonly<{ page_views: number | string | null }>;
type PopularRow = Readonly<{
  content_id: string;
  page_views: number | string | null;
}>;

/**
 * D1 storage aggregates page views by UTC day. It never writes individual event
 * records. Ranges select whole matching UTC buckets, so sub-day bounds are not
 * exact and should be avoided by callers that need event-level precision.
 */
export class D1AnalyticsStorage implements AnalyticsStorage {
  readonly capabilities = new Set([
    "capture",
    "content_page_views",
    "popular_content",
  ] as const);

  constructor(private readonly database: D1Database) {}

  async capture(event: AnalyticsEvent): Promise<void> {
    if (!isPageView(event)) return;
    const bucketStart = event.occurredAt.slice(0, 10);
    await this.database
      .prepare(
        `INSERT INTO analytics_page_views (content_id, bucket_start, page_views)
         VALUES (?, ?, 1)
         ON CONFLICT(content_id, bucket_start)
         DO UPDATE SET page_views = page_views + 1`,
      )
      .bind(event.contentId, bucketStart)
      .run();
  }

  async query(query: AnalyticsQuery): Promise<AnalyticsResult> {
    assertAnalyticsQuerySupported(this, query);
    const range = bucketRange(query.timeRange);
    if (query.type === "content_page_views") {
      const result = await this.database
        .prepare(
          `SELECT COALESCE(SUM(page_views), 0) AS page_views
           FROM analytics_page_views
           WHERE content_id = ?${range.clause}`,
        )
        .bind(query.contentId, ...range.values)
        .all<CountRow>();
      return {
        type: query.type,
        contentId: query.contentId,
        pageViews: numberValue(result.results?.[0]?.page_views),
      };
    }
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
    const result = await this.database
      .prepare(
        `SELECT content_id, SUM(page_views) AS page_views
         FROM analytics_page_views${range.where}
         GROUP BY content_id
         ORDER BY page_views DESC, content_id ASC
         LIMIT ?`,
      )
      .bind(...range.values, limit)
      .all<PopularRow>();
    return {
      type: query.type,
      items: (result.results ?? []).map(
        (row): PopularContentItem => ({
          contentId: row.content_id,
          pageViews: numberValue(row.page_views),
        }),
      ),
    };
  }
}

/** Creates a D1-backed analytics storage adapter from a Worker binding. */
export function d1Storage(database: D1Database): AnalyticsStorage {
  return new D1AnalyticsStorage(database);
}

function isPageView(event: AnalyticsEvent): event is AnalyticsPageViewEvent {
  return event.type === "page_view";
}

function bucketRange(timeRange: AnalyticsQuery["timeRange"]): {
  clause: string;
  where: string;
  values: string[];
} {
  const values: string[] = [];
  if (timeRange?.from) values.push(timeRange.from.slice(0, 10));
  if (timeRange?.to) values.push(timeRange.to.slice(0, 10));
  const conditions = [
    timeRange?.from ? "bucket_start >= ?" : undefined,
    timeRange?.to ? "bucket_start <= ?" : undefined,
  ].filter((condition): condition is string => condition !== undefined);
  const clause = conditions.length ? ` AND ${conditions.join(" AND ")}` : "";
  return {
    clause,
    where: conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

function numberValue(value: number | string | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}
