export type AliasRedirectStatus = 301 | 302 | 307 | 308;

export type AliasOptions = {
  /** Redirect status recorded for every alias path. Defaults to `308`. */
  status?: AliasRedirectStatus;
  /**
   * Maximum length of each percent-encoded path segment. Aliases with a longer
   * segment are skipped with an `alias-too-long` warning.
   */
  maxSegmentLength?: number;
};

export type ResolvedAliasOptions = {
  status: AliasRedirectStatus;
  maxSegmentLength?: number;
};

export function resolveAliasOptions(
  options: AliasOptions,
): ResolvedAliasOptions {
  const status = options.status ?? 308;
  if (!([301, 302, 307, 308] as const).includes(status)) {
    throw new Error(`Invalid alias redirect status: ${status}`);
  }
  if (
    options.maxSegmentLength !== undefined &&
    (!Number.isInteger(options.maxSegmentLength) ||
      options.maxSegmentLength < 1)
  ) {
    throw new Error(
      `Invalid alias maxSegmentLength: ${options.maxSegmentLength}`,
    );
  }
  return {
    status,
    ...(options.maxSegmentLength === undefined
      ? {}
      : { maxSegmentLength: options.maxSegmentLength }),
  };
}

/**
 * Converts an Obsidian alias (a bare note name, not a path) into a site-local
 * pathname. Returns `null` when the alias cannot be represented safely, so the
 * caller can report it instead of emitting a broken redirect.
 *
 * A leading slash is accepted and ignored, so both `Old Name` and `/Old Name`
 * resolve to `/Old%20Name`. The normalization intentionally matches the
 * request-path encoding used by the HonoX integration.
 */
export function resolveAliasPath(alias: string): string | null {
  const raw = alias.trim();
  if (!raw) return null;

  const trimmed = raw.replace(/^\/+/, "");
  if (!trimmed || /[\\?#]/.test(trimmed) || trimmed.includes("//")) return null;

  const segments: string[] = [];
  for (const segment of trimmed.split("/")) {
    if (
      !segment ||
      segment === "." ||
      segment === ".." ||
      hasMalformedPercentEncoding(segment)
    ) {
      return null;
    }
    segments.push(encodeURIComponent(decodeURIComponent(segment)));
  }

  return `/${segments.join("/")}`;
}

function hasMalformedPercentEncoding(value: string): boolean {
  try {
    decodeURIComponent(value);
    return false;
  } catch {
    return true;
  }
}
