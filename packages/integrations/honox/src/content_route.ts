import type {
  ContentManager,
  ContentManifest,
  ContentManifestEntry,
  PostContent,
  ResolvedPluginPage,
} from "@riebeckite/core";
import { getEntryLanguage, htmlOutputPath } from "@riebeckite/core";
import type { Context, Handler, MiddlewareHandler } from "hono";

export type ResolvedContentRoute =
  | { kind: "content"; entry: ContentManifestEntry }
  | { kind: "redirect"; location: string; status: 301 | 302 | 307 | 308 }
  | null;

export type ResolvedRiebeckiteRoute =
  | Exclude<ResolvedContentRoute, null>
  | { kind: "page"; page: ResolvedPluginPage }
  | null;

/**
 * Resolves plugin pages before manifest-backed content routes. This is the
 * single HonoX adapter needed by a catch-all site route; plugins never add
 * HonoX routes themselves.
 */
export async function resolveRiebeckiteRoute(
  content: Pick<ContentManager, "resolvePage" | "getManifest">,
  pathname: string,
): Promise<ResolvedRiebeckiteRoute> {
  const page = await content.resolvePage(pathname);
  if (page) return { kind: "page", page };
  return resolveContentRoute(await content.getManifest(), pathname);
}

/**
 * The resolved route request a Site consumes from a catch-all content route.
 *
 * `content` carries everything the Site composition needs; `page` and
 * `response` are framework mechanics the Site forwards without interpreting.
 */
export type ResolvedContentRequest =
  | { kind: "content"; entry: ContentManifestEntry; post: PostContent }
  | { kind: "page"; page: ResolvedPluginPage }
  | { kind: "response"; response: Response | Promise<Response> };

/**
 * Assigns the resolved route metadata to the request context.
 *
 * Plugins and primitives read `htmlLanguage` and `headTags` from the context,
 * so the resolver owns their values instead of each route rebuilding them.
 */
export function applyRiebeckiteRouteContext(
  c: Context,
  route: Exclude<ResolvedRiebeckiteRoute, null>,
): void {
  if (route.kind === "page") {
    c.set("headTags", route.page.headTags ?? []);
    c.set("htmlLanguage", route.page.language);
    return;
  }
  if (route.kind === "content") {
    c.set("headTags", route.entry.headTags ?? []);
    c.set("htmlLanguage", getEntryLanguage(route.entry));
  }
}

const contentExtensionPattern = /\.[a-zA-Z0-9]+$/;

type RouteContent = Pick<
  ContentManager,
  "resolvePage" | "getManifest" | "getProcessedContent"
>;

async function resolveRouteRequest(
  c: Context,
  content: RouteContent,
): Promise<ResolvedContentRequest> {
  const route = await resolveRiebeckiteRoute(content, c.req.path);
  if (!route) return { kind: "response", response: c.notFound() };
  if (route.kind === "redirect") {
    return {
      kind: "response",
      response: c.redirect(route.location, route.status),
    };
  }

  applyRiebeckiteRouteContext(c, route);
  if (route.kind === "page") return { kind: "page", page: route.page };

  const post = await content.getProcessedContent(route.entry.slug);
  return { kind: "content", entry: route.entry, post };
}

/**
 * Resolves a catch-all content request into what a Site should render.
 *
 * Owns the route mechanics a Site must not repeat: the wildcard and content
 * extension guards, plugin page vs content resolution, redirect and not-found
 * responses, context assignment, and loading the processed content.
 */
export async function resolveRiebeckiteContentRequest(
  c: Context,
  content: RouteContent,
  parameter = "slug",
): Promise<ResolvedContentRequest> {
  const requestedSlug = c.req.param(parameter);
  if (!requestedSlug) return { kind: "response", response: c.notFound() };
  if (contentExtensionPattern.test(requestedSlug)) {
    return { kind: "response", response: c.notFound() };
  }

  return resolveRouteRequest(c, content);
}

/**
 * Resolves the `/` Homepage request into what a Site should render.
 *
 * Shares every catch-all mechanic with `resolveRiebeckiteContentRequest` but
 * has no wildcard parameter to guard. It additionally owns the configured-index
 * redirect: when the `index` content is permalinked away from `/`, the root
 * forwards there instead of resolving another route.
 */
export async function resolveRiebeckiteHomeRequest(
  c: Context,
  content: RouteContent,
): Promise<ResolvedContentRequest> {
  const indexEntry = (await content.getManifest()).bySlug.get("index");
  if (indexEntry && indexEntry.permalink !== "/") {
    return {
      kind: "response",
      response: c.redirect(indexEntry.permalink, 308),
    };
  }

  return resolveRouteRequest(c, content);
}

/** Returns catch-all parameters for every plugin page registered for SSG. */
export async function pluginPageSsgParams(
  content: Pick<ContentManager, "getPagePaths">,
  parameter = "slug",
): Promise<Record<string, string>[]> {
  const paths = await content.getPagePaths();
  return paths
    .filter((path) => path !== "/")
    .map((path) => ({ [parameter]: path.replace(/^\/+/, "") }));
}

export async function riebeckiteSsgParams(
  content: Pick<
    ContentManager,
    "getManifest" | "getOutputChangeSet" | "getPagePaths"
  >,
  parameter = "slug",
): Promise<Record<string, string>[]> {
  const [manifest, changeSet] = await Promise.all([
    content.getManifest({ incremental: true }),
    content.getOutputChangeSet({ incremental: true }),
  ]);
  if (
    changeSet.fullRegenerationRequired ||
    process.env.RIEBECKITE_SSG_FULL_REGENERATION === "1"
  ) {
    return [
      ...manifest.publicEntries
        .filter((entry) => entry.permalink !== "/")
        .map((entry) => ({ [parameter]: entry.permalink.replace(/^\/+/, "") })),
      ...[...manifest.publicRedirects.keys()]
        .filter((path) => path !== "/")
        .map((path) => ({ [parameter]: path.replace(/^\/+/, "") })),
      ...(await pluginPageSsgParams(content, parameter)),
    ];
  }

  const affected = new Set(
    changeSet.affected
      .filter((output) => output.kind !== "generated")
      .map((output) => output.path),
  );
  const contentParams = manifest.publicEntries
    .filter((entry) => affected.has(routeOutputPath(entry.permalink)))
    .map((entry) => ({ [parameter]: entry.permalink.replace(/^\/+/, "") }));
  const redirectParams = [...manifest.publicRedirects.keys()]
    .filter((path) => affected.has(routeOutputPath(path)))
    .filter((path) => path !== "/")
    .map((path) => ({ [parameter]: path.replace(/^\/+/, "") }));
  const pluginPageParams = (await content.getPagePaths())
    .filter((path) => affected.has(routeOutputPath(path)))
    .filter((path) => path !== "/")
    .map((path) => ({ [parameter]: path.replace(/^\/+/, "") }));
  return [...contentParams, ...redirectParams, ...pluginPageParams];
}

export function resolveContentRoute(
  manifest: ContentManifest,
  pathname: string,
): ResolvedContentRoute {
  const path = normalizeRequestPath(pathname);
  const entry = manifest.byRoutablePermalink.get(path);
  if (entry) return { kind: "content", entry };
  const redirect = manifest.publicRedirects.get(path);
  if (!redirect) return null;
  const target = manifest.byRoutablePermalink.get(
    manifest.bySlug.get(redirect.slug)?.permalink ?? "",
  );
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
// biome-ignore lint/suspicious/noExplicitAny: Hono's Handler generics (env/path/response) are intentionally left open so any route handler can pass through.
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
  const segments = pathname.split("/").filter(Boolean).map(decodeSegment);
  const path = `/${segments.join("/")}`;
  return trailingSlash ? `${path}/` : path;
}

function routeOutputPath(pathname: string): string {
  return htmlOutputPath(normalizeRequestPath(pathname));
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
