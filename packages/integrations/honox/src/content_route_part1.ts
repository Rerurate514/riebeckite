import {
  type ContentManager,
  type ContentManifest,
  type ContentManifestEntry,
  getEntryLanguage,
  type PostContent,
  type ResolvedPluginPage,
} from "@riebeckite/core";
import type { Context, MiddlewareHandler } from "hono";
import {
  isDynamicRoute,
  normalizeRequestPath,
  redirectSsgPaths,
  routeOutputPath,
} from "./content_route_part2.js";

export type ResolvedContentRoute =
  | { kind: "content"; entry: ContentManifestEntry }
  | { kind: "redirect"; location: string; status: 301 | 302 | 307 | 308 }
  | null;

export type ResolvedRiebeckiteRoute =
  | Exclude<ResolvedContentRoute, null>
  | { kind: "page"; page: ResolvedPluginPage }
  | null;

export async function resolveRiebeckiteRoute(
  content: Pick<ContentManager, "resolvePage" | "getRequestManifest">,
  pathname: string,
): Promise<ResolvedRiebeckiteRoute> {
  const page = await content.resolvePage(pathname);
  if (page) return { kind: "page", page };
  return resolveContentRoute(await content.getRequestManifest(), pathname);
}

export type ResolvedContentRequest =
  | { kind: "content"; entry: ContentManifestEntry; post: PostContent }
  | { kind: "page"; page: ResolvedPluginPage }
  | { kind: "response"; response: Response | Promise<Response> };

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

export const contentExtensionPattern = /\.[a-zA-Z0-9]+$/;

export type RouteContent = Pick<
  ContentManager,
  "resolvePage" | "getRequestManifest" | "getProcessedContent"
>;

export async function resolveRouteRequest(
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

export async function resolveRiebeckiteContentRequest(
  c: Context,
  content: RouteContent,
  parameter = "slug",
): Promise<ResolvedContentRequest> {
  const requestedSlug = c.req.param(parameter);
  if (!requestedSlug) return { kind: "response", response: c.notFound() };
  if (contentExtensionPattern.test(requestedSlug)) {
    const page = await content.resolvePage(c.req.path);
    if (page) {
      applyRiebeckiteRouteContext(c, { kind: "page", page });
      return { kind: "page", page };
    }
    return { kind: "response", response: c.notFound() };
  }

  return resolveRouteRequest(c, content);
}

export async function resolveRiebeckiteHomeRequest(
  c: Context,
  content: RouteContent,
): Promise<ResolvedContentRequest> {
  const indexEntry = (await content.getRequestManifest()).bySlug.get("index");
  if (indexEntry && indexEntry.permalink !== "/") {
    return {
      kind: "response",
      response: c.redirect(indexEntry.permalink, 308),
    };
  }

  return resolveRouteRequest(c, content);
}

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
  const changeSet = await content.getOutputChangeSet({ incremental: true });
  if (
    process.env.RIEBECKITE_SSG_SKIP_UNCHANGED === "1" &&
    !changeSet.fullRegenerationRequired &&
    changeSet.affected.length === 0
  ) {
    return [];
  }
  const manifest = await content.getManifest({ incremental: true });
  if (
    changeSet.fullRegenerationRequired ||
    process.env.RIEBECKITE_SSG_FULL_REGENERATION === "1"
  ) {
    return [
      ...manifest.publicEntries
        .filter((entry) => entry.permalink !== "/")
        .map((entry) => ({ [parameter]: entry.permalink.replace(/^\/+/, "") })),
      ...redirectSsgPaths(manifest)
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
    .filter((entry) => entry.permalink !== "/")
    .map((entry) => ({ [parameter]: entry.permalink.replace(/^\/+/, "") }));
  const redirectParams = redirectSsgPaths(manifest)
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

export type SsgParams = Record<string, string>[];

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
