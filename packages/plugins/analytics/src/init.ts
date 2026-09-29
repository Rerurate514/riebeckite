import type { AnalyticsPageViewEvent } from "./event.js";
import type { AnalyticsPublicConfig } from "./options.js";

export const ANALYTICS_CONTENT_ID_ATTRIBUTE = "data-riebeckite-content-id";
const INITIALIZED_ATTRIBUTE = "data-riebeckite-analytics-initialized";

/**
 * Sends one document-level page view. Static Riebeckite sites reload documents
 * on navigation; SPA history hooks are intentionally not installed.
 */
export function initAnalytics(config: AnalyticsPublicConfig): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (document.documentElement.hasAttribute(INITIALIZED_ATTRIBUTE)) return;
  document.documentElement.setAttribute(INITIALIZED_ATTRIBUTE, "");

  const contentId = document
    .querySelector(`[${ANALYTICS_CONTENT_ID_ATTRIBUTE}]`)
    ?.getAttribute(ANALYTICS_CONTENT_ID_ATTRIBUTE);
  if (!contentId) return;

  const event: AnalyticsPageViewEvent = {
    type: "page_view",
    contentId,
    occurredAt: new Date().toISOString(),
    path: window.location.pathname,
    ...(document.documentElement.lang
      ? { lang: document.documentElement.lang }
      : {}),
  };
  void sendAnalyticsEvent(config.collectorUrl, event);
}

async function sendAnalyticsEvent(
  collectorUrl: string,
  event: AnalyticsPageViewEvent,
): Promise<void> {
  await fetch(collectorUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}
