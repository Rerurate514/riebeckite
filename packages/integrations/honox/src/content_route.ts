import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";

export type ResolvedContentRoute =
  | { kind: "content"; entry: ContentManifestEntry }
  | { kind: "redirect"; location: string; status: 301 | 302 | 307 | 308 }
  | null;

/** Resolves a request pathname from the build-time content public-location index. */
export function resolveContentRoute(
  manifest: ContentManifest,
  pathname: string,
): ResolvedContentRoute {
  const path = normalizeRequestPath(pathname);
  const entry = manifest.byPermalink.get(path);
  if (entry) return { kind: "content", entry };
  const redirect = manifest.redirects.get(path);
  if (!redirect) return null;
  const target = manifest.bySlug.get(redirect.slug);
  if (!target) return null;
  return {
    kind: "redirect",
    location: target.permalink,
    status: redirect.status,
  };
}

function normalizeRequestPath(pathname: string): string {
  const trailingSlash = pathname.length > 1 && pathname.endsWith("/");
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)));
  const path = `/${segments.join("/")}`;
  return trailingSlash ? `${path}/` : path;
}
