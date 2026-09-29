/** An ISO 8601 time interval. Bounds are inclusive when a provider supports them. */
export type AnalyticsTimeRange = Readonly<{
  from?: string;
  to?: string;
}>;

/** A content page view always uses the stable, source-authored content ID. */
export type AnalyticsPageViewEvent = Readonly<{
  type: "page_view";
  contentId: string;
  occurredAt: string;
  path?: string;
  lang?: string;
}>;

/** Base shape for provider-specific events. Consumers can narrow this type. */
export type AnalyticsCustomEvent = Readonly<{
  type: string;
  occurredAt: string;
}>;

/**
 * Events accepted by an analytics provider. Supplying a custom event union
 * preserves the strongly typed built-in `page_view` event.
 */
export type AnalyticsEvent<
  TCustomEvent extends AnalyticsCustomEvent = AnalyticsCustomEvent,
> = AnalyticsPageViewEvent | TCustomEvent;
