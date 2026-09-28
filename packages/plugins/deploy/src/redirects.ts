import {
  escapeHtml,
  escapeHtmlAttribute,
  normalizeGeneratedOutputPath,
} from "@riebeckite/core";
import type { PublicRedirect } from "./types.js";

const PERMANENT_STATUSES: ReadonlySet<number> = new Set([301, 308]);

export function isPermanentRedirect(status: PublicRedirect["status"]): boolean {
  return PERMANENT_STATUSES.has(status);
}

/**
 * Deterministic ordering shared by every renderer: by `from`, then `to`, then
 * `status`, using code-unit comparison so the result never depends on locale.
 */
export function compareRedirects(
  left: PublicRedirect,
  right: PublicRedirect,
): number {
  return (
    compareStrings(left.from, right.from) ||
    compareStrings(left.to, right.to) ||
    left.status - right.status
  );
}

export function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Drops incomplete redirects, removes exact duplicates, and sorts the rest.
 * Renderers build on this so repeated builds produce identical bytes.
 */
export function normalizeRedirects(
  redirects: readonly PublicRedirect[],
): PublicRedirect[] {
  const byKey = new Map<string, PublicRedirect>();
  for (const redirect of redirects) {
    const from = redirect.from.trim();
    const to = redirect.to.trim();
    if (from.length === 0 || to.length === 0) continue;
    const key = `${from}\u0000${to}\u0000${redirect.status}`;
    if (!byKey.has(key)) {
      byKey.set(key, { from, to, status: redirect.status });
    }
  }
  return [...byKey.values()].sort(compareRedirects);
}

/**
 * Renders Netlify / Cloudflare Pages `_redirects` syntax: one `from to status`
 * line per redirect, sorted and deduped, with a trailing newline.
 */
export function renderRedirectLines(
  redirects: readonly PublicRedirect[],
): string {
  const normalized = normalizeRedirects(redirects);
  if (normalized.length === 0) return "";
  return `${normalized
    .map((redirect) => `${redirect.from} ${redirect.to} ${redirect.status}`)
    .join("\n")}\n`;
}

/**
 * Resolves a redirect `from` into an output-relative HTML stub path. Traversal
 * and absolute segments are resolved rather than trusted, and the result is
 * validated against `normalizeGeneratedOutputPath`. Returns `null` when no safe
 * stub path can be produced (for example the root path `/`).
 */
export function redirectStubPath(from: string): string | null {
  const path = from.split(/[?#]/)[0] ?? "";
  const segments: string[] = [];
  for (const segment of path.replace(/\\/g, "/").split("/")) {
    if (segment.length === 0 || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  if (segments.length === 0) return null;
  try {
    return normalizeGeneratedOutputPath(`${segments.join("/")}/index.html`);
  } catch {
    return null;
  }
}

export function renderRedirectStub(redirect: PublicRedirect): string {
  return renderRedirectStubFor(redirect, undefined);
}

export function renderRedirectStubFor(
  redirect: PublicRedirect,
  baseUrl: string | undefined,
): string {
  const target = resolveTargetUrl(redirect.to, baseUrl);
  const href = escapeHtmlAttribute(target);
  const label = escapeHtml(target);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    `<meta http-equiv="refresh" content="0; url=${href}">`,
    `<link rel="canonical" href="${href}">`,
    "<title>Redirecting</title>",
    "</head>",
    "<body>",
    `<p>Redirecting to <a href="${href}">${label}</a>.</p>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

export function renderNotFoundPage(): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    "<title>Page not found</title>",
    "</head>",
    "<body>",
    '<p>Page not found. <a href="/">Go to the home page</a>.</p>',
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function resolveTargetUrl(target: string, baseUrl: string | undefined): string {
  if (!baseUrl) return target;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return target;
  try {
    return new URL(target, baseUrl).href;
  } catch {
    return target;
  }
}
