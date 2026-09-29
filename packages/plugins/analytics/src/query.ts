import type { AnalyticsTimeRange } from "./event.js";

export type ContentPageViewsQuery = Readonly<{
  type: "content_page_views";
  contentId: string;
  timeRange?: AnalyticsTimeRange;
}>;

export type PopularContentQuery = Readonly<{
  type: "popular_content";
  limit?: number;
  timeRange?: AnalyticsTimeRange;
}>;

export type AnalyticsQuery = ContentPageViewsQuery | PopularContentQuery;

export type ContentPageViewsResult = Readonly<{
  type: "content_page_views";
  contentId: string;
  pageViews: number;
}>;

export type PopularContentItem = Readonly<{
  contentId: string;
  pageViews: number;
}>;

export type PopularContentResult = Readonly<{
  type: "popular_content";
  items: readonly PopularContentItem[];
}>;

export type AnalyticsResult = ContentPageViewsResult | PopularContentResult;
