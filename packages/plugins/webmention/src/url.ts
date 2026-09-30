/**
 * URL helpers shared by verification, target matching, and storage. They keep
 * comparison stable without changing the URLs that are persisted or rendered.
 */

/** Parses an absolute http(s) URL and returns a canonical comparison form. */
export function normalizeWebmentionUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  return url.toString();
}

/**
 * Canonical form used for equality checks. Fragments and a single trailing
 * slash are ignored so `https://example.com/a`, `https://example.com/a/`, and
 * `https://example.com/a#section` are treated as the same target.
 */
export function urlComparisonKey(value: string): string {
  const normalized = normalizeWebmentionUrl(value);
  if (normalized === null) return value;

  const url = new URL(normalized);
  url.hash = "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

/** Resolves a site-relative permalink against the configured base URL. */
export function resolvePublicUrl(
  permalink: string,
  baseUrl: string | undefined,
): string | null {
  try {
    return new URL(permalink, baseUrl ?? "https://example.invalid").toString();
  } catch {
    return null;
  }
}
