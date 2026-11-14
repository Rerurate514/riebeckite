import type { ContentManifest } from "@riebeckite/core";
import type { DevelopmentDiagnostic } from "@riebeckite/diagnostics";
import { reportPath } from "./development_inspector_paths.js";

export function currentPageFromRequest(url: string | undefined): string {
  const value = new URL(url ?? reportPath, "http://localhost").searchParams.get(
    "path",
  );
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function normalizePagePath(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : "/";
}

export function currentPageSourceSlugs(
  manifest: ContentManifest | undefined,
  pathname: string,
): string[] {
  if (!manifest) return [];
  const target = normalizePagePath(pathname);
  const sources = new Set<string>();
  for (const entry of manifest.publicEntries) {
    if (normalizePagePath(entry.publicLocation.permalink) === target) {
      sources.add(entry.slug);
    }
    for (const redirect of entry.publicLocation.redirects ?? []) {
      if (normalizePagePath(redirect.path) === target) sources.add(entry.slug);
    }
  }
  for (const [redirectPath, redirect] of manifest.publicRedirects) {
    if (
      normalizePagePath(redirectPath) === target ||
      normalizePagePath(redirect.path) === target
    ) {
      sources.add(redirect.slug);
    }
  }
  for (const route of manifest.pageRoutes ?? []) {
    if (normalizePagePath(route.pathname) !== target) continue;
    for (const sourceSlug of route.sourceSlugs ?? []) sources.add(sourceSlug);
  }
  return [...sources].sort();
}

export function diagnosticMatchesPage(
  diagnostic: Pick<DevelopmentDiagnostic, "subject" | "location">,
  sources: readonly string[],
): boolean {
  const values = [diagnostic.subject?.value, diagnostic.location?.file].filter(
    (value): value is string => typeof value === "string",
  );
  return sources.some((source) =>
    values.some(
      (value) =>
        value === source ||
        value === `${source}.md` ||
        value.startsWith(`${source}.md:`),
    ),
  );
}
