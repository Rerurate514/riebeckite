import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
} from "@riebeckite/core";
import { diagnostic, normalizeRoutePath } from "./site_integrity_shared.js";
import type {
  RouteOwner,
  SiteIntegrityOptions,
} from "./site_integrity_types.js";

export function buildRouteOwners(
  manifest: ContentManifest,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): Map<string, RouteOwner> {
  const owners = new Map<string, RouteOwner>();
  const pageRoutes = manifest.pageRoutes ?? [];
  const pageSources = new Map<string, Set<string>>();
  for (const route of pageRoutes) {
    if (!route.sourceSlugs || route.sourceSlugs.length === 0) continue;
    const path = normalizeRoutePath(route.pathname);
    const sources = pageSources.get(path) ?? new Set<string>();
    for (const sourceSlug of route.sourceSlugs) sources.add(sourceSlug);
    pageSources.set(path, sources);
  }

  for (const entry of manifest.publicEntries) {
    const path = normalizeRoutePath(entry.publicLocation.permalink);
    if (pageSources.get(path)?.has(entry.slug)) continue;
    reserveRoute(owners, diagnostics, options, {
      path,
      slug: entry.slug,
      kind: "content",
    });
  }
  for (const [path, redirect] of manifest.publicRedirects) {
    reserveRoute(owners, diagnostics, options, {
      path: normalizeRoutePath(path),
      slug: redirect.slug,
      kind: "redirect",
    });
  }
  for (const route of pageRoutes) {
    reserveRoute(owners, diagnostics, options, {
      path: normalizeRoutePath(route.pathname),
      slug: `(plugin-page:${route.pluginName}:${route.pageType})`,
      kind: "page",
      producer: `${route.pluginName}:${route.pageType}`,
    });
  }
  if (pageRoutes.length === 0) {
    for (const path of manifest.pagePaths ?? []) {
      reserveRoute(owners, diagnostics, options, {
        path: normalizeRoutePath(path),
        slug: "(plugin-page)",
        kind: "page",
      });
    }
  }
  return owners;
}

export function reserveRoute(
  owners: Map<string, RouteOwner>,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
  next: RouteOwner,
): void {
  const previous = owners.get(next.path);
  if (!previous) {
    owners.set(next.path, next);
    return;
  }
  if (previous.slug === next.slug && previous.kind === next.kind) return;

  const code =
    previous.kind === "redirect" || next.kind === "redirect"
      ? "content-integrity:redirect-public-location-conflict"
      : "content-integrity:duplicate-public-location";
  diagnostics.push(
    diagnostic(options, {
      code,
      slug: next.slug.startsWith("(") ? undefined : next.slug,
      target: next.path,
      message: `Public path "${next.path}" is claimed by both ${describeOwner(previous)} and ${describeOwner(next)}.`,
      suggestion: "Change one permalink, alias, redirect, or page path.",
      meta: { previous, next },
    }),
  );
}

export function describeOwner(owner: RouteOwner): string {
  return `${owner.kind} "${owner.producer ?? owner.slug}"`;
}

export function checkAmbiguousFolderPageOwners(
  manifest: ContentManifest,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): void {
  const candidates = new Map<
    string,
    Partial<Record<"README" | "index", ContentManifestEntry>>
  >();
  for (const entry of manifest.entries) {
    const basename = entry.slug.split("/").at(-1);
    if (basename !== "README" && basename !== "index") continue;
    const folder = entry.slug.split("/").slice(0, -1).join("/");
    if (!folder) continue;
    const folderCandidates = candidates.get(folder) ?? {};
    folderCandidates[basename] = entry;
    candidates.set(folder, folderCandidates);
  }
  for (const [folder, entries] of candidates) {
    const readme = entries.README;
    const index = entries.index;
    if (!readme || !index) continue;
    diagnostics.push(
      diagnostic(options, {
        code: "content-integrity:ambiguous-folder-page-owner",
        target: folder,
        message: `Folder "${folder}" has both README and index Folder Page candidates.`,
        suggestion:
          "Keep either README or index so the Folder Page owner is unambiguous.",
        meta: {
          folder,
          readme: {
            slug: readme.slug,
            permalink: readme.publicLocation.permalink,
          },
          index: {
            slug: index.slug,
            permalink: index.publicLocation.permalink,
          },
        },
      }),
    );
  }
}
