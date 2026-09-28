import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import type { Context, Handler, MiddlewareHandler } from "hono";

export type ResolvedContentRoute =
  | { kind: "content"; entry: ContentManifestEntry }
  | { kind: "redirect"; location: string; status: 301 | 302 | 307 | 308 }
  | null;

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

type SsgParams = Record<string, string>[];

/**
 * SSG parameter middleware for a catch-all content route.
 *
 * `ssgParams` from `hono/ssg` decides whether to emit params only from the
 * request path. When a shallow catch-all (for example `/:slug{.+}`) is
 * registered before a deeper one (`/tags/:slug{.+}`), the shallow route
 * captures the enumeration request of the deeper route and injects its own
 * params. This helper responds only to the enumeration request that belongs to
 * `routePath`, so sibling catch-all routes can enumerate their own params.
 */
export function contentRouteSsgParams(
  routePath: string,
  params: SsgParams | ((c: Context) => SsgParams | Promise<SsgParams>),
): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.path !== routePath || !isDynamicRoute(routePath)) {
      await next();
      return;
    }
    (c.req.raw as { ssgParams?: SsgParams }).ssgParams =
      typeof params === "function" ? await params(c) : params;
    return c.notFound();
  };
}

/**
 * Make a route handler visible to Hono's SSG route enumeration.
 *
 * `toSSG` skips any route whose final handler is a middleware, which Hono
 * detects with `handler.length > 1`. A catch-all content route sometimes needs
 * `next()` to defer to a more specific route, so wrapping the handler in a
 * rest-parameter function keeps `length === 0` while preserving `(c, next)`.
 */
export function ssgEnumerableHandler<H extends Handler<any, any, any>>(
  handler: H,
): H {
  const enumerable = (...args: Parameters<H>): ReturnType<H> =>
    Reflect.apply(handler, undefined, args) as ReturnType<H>;
  return enumerable as H;
}

function isDynamicRoute(path: string): boolean {
  return path
    .split("/")
    .some((segment) => segment.startsWith(":") || segment.includes("*"));
}

function normalizeRequestPath(pathname: string): string {
  const trailingSlash = pathname.length > 1 && pathname.endsWith("/");
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map(decodeSegment);
  const path = `/${segments.join("/")}`;
  return trailingSlash ? `${path}/` : path;
}

/**
 * Content permalinks are stored decoded, while request paths may arrive
 * percent-encoded. Decode each segment so both forms resolve to the same
 * manifest key; already-decoded input passes through unchanged.
 */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
