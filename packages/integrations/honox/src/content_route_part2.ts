import { type ContentManifest, htmlOutputPath } from "@riebeckite/core";
import type { Handler } from "hono";

export function ssgEnumerableHandler<H extends Handler<any, any, any>>(
  handler: H,
): H {
  const enumerable = (...args: Parameters<H>): ReturnType<H> =>
    Reflect.apply(handler, undefined, args) as ReturnType<H>;
  return enumerable as H;
}

export function isDynamicRoute(path: string): boolean {
  return path
    .split("/")
    .some((segment) => segment.startsWith(":") || segment.includes("*"));
}

export function normalizeRequestPath(pathname: string): string {
  const trailingSlash = pathname.length > 1 && pathname.endsWith("/");
  const segments = pathname.split("/").filter(Boolean).map(encodeSegment);
  const path = `/${segments.join("/")}`;
  return trailingSlash ? `${path}/` : path;
}

export function redirectSsgPaths(manifest: ContentManifest): string[] {
  const paths: string[] = [];
  for (const [path, redirect] of manifest.publicRedirects) {
    const permalink = manifest.bySlug.get(redirect.slug)?.permalink;
    if (permalink && htmlOutputPath(permalink) === routeOutputPath(path))
      continue;
    paths.push(path);
  }
  return paths;
}

export function routeOutputPath(pathname: string): string {
  return htmlOutputPath(pathname);
}

export function encodeSegment(segment: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}
