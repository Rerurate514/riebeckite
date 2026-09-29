import type { AnalyticsProvider } from "@riebeckite/plugin-analytics";

/** Runtime-owned analytics storage boundary. Select one implementation per Worker. */
export type AnalyticsStorage = AnalyticsProvider;
