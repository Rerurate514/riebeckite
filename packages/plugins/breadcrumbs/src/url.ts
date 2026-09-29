import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";

export function buildAbsoluteUrl(
  config: ResolvedRiebeckiteConfig,
  pathOrUrl: string,
): string {
  if (!pathOrUrl) return config.site.baseUrl;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return new URL(
    pathOrUrl,
    config.site.baseUrl || "https://example.com",
  ).toString();
}
