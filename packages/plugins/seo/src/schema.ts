import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { buildAbsoluteUrl } from "./url.js";

export function buildBreadcrumbSchema(
  config: ResolvedRiebeckiteConfig,
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url || buildAbsoluteUrl(config, "/"),
    })),
  };
}

export function removeUndefined<T extends Record<string, unknown>>(
  value: T,
): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}
