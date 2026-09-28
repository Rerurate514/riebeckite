import { createHash } from "node:crypto";

const LOCK_VERSION = 1;

export type RedirectStatus = 301 | 302 | 307 | 308;

export type RouteLockRoute = {
  permalink: string;
  contentHash: string;
  id?: string;
};

export type RouteLockRedirect = {
  from: string;
  to: string;
  status: RedirectStatus;
  reason: "rename" | "id";
};

export type RouteLock = {
  version: 1;
  routes: Record<string, RouteLockRoute>;
  redirects: RouteLockRedirect[];
};

export type RedirectRule = RouteLock["redirects"][number];

export type RenameDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  slug?: string;
  suggestion?: string;
};

export type DiffRoutesResult = {
  lock: RouteLock;
  added: RedirectRule[];
  diagnostics: RenameDiagnostic[];
};

export type DiffRoutesOptions = {
  status?: RedirectStatus;
  onUnexpectedRemoval?: "info" | "warning" | "error";
};

/**
 * Minimal shape `buildRouteLock` reads from a content manifest entry. Only
 * published entries should reach this function; the caller supplies the
 * publish predicate so this module stays free of any runtime Core import.
 */
export type RouteLockSourceEntry = {
  slug: string;
  permalink: string;
  frontmatter: Record<string, unknown>;
  html: string;
};

export function hashContent(html: string): string {
  return createHash("sha256").update(html, "utf8").digest("hex");
}

export function emptyRouteLock(): RouteLock {
  return { version: LOCK_VERSION, routes: {}, redirects: [] };
}

export function isRedirectStatus(value: unknown): value is RedirectStatus {
  return value === 301 || value === 302 || value === 307 || value === 308;
}

/**
 * Builds the current route lock from manifest entries. Entries are keyed by
 * slug and only published entries are considered. Output is deterministic:
 * route keys are sorted and redirects (always empty here) stay sorted.
 */
export function buildRouteLock(
  entries: readonly RouteLockSourceEntry[],
  isPublished: (frontmatter: Record<string, unknown>) => boolean,
): RouteLock {
  const routes: Record<string, RouteLockRoute> = {};
  for (const entry of entries) {
    if (!isPublished(entry.frontmatter)) continue;
    const id = readId(entry.frontmatter);
    routes[entry.slug] = id
      ? { permalink: entry.permalink, contentHash: hashContent(entry.html), id }
      : { permalink: entry.permalink, contentHash: hashContent(entry.html) };
  }
  return { version: LOCK_VERSION, routes: sortRoutes(routes), redirects: [] };
}

/**
 * Parses a persisted lock. Returns `undefined` when the value is corrupt or
 * uses an unknown format, so callers can fall back to an empty lock.
 */
export function parseRouteLock(value: unknown): RouteLock | undefined {
  if (!isRecord(value) || value.version !== LOCK_VERSION) return undefined;
  if (!isRecord(value.routes)) return undefined;
  if (!Array.isArray(value.redirects)) return undefined;

  const routes: Record<string, RouteLockRoute> = {};
  for (const [slug, raw] of Object.entries(value.routes)) {
    if (slug.length === 0 || !isRecord(raw)) return undefined;
    const { permalink, contentHash } = raw;
    if (typeof permalink !== "string" || typeof contentHash !== "string")
      return undefined;
    let id: string | undefined;
    if (raw.id !== undefined) {
      if (typeof raw.id !== "string") return undefined;
      id = raw.id;
    }
    routes[slug] =
      id === undefined
        ? { permalink, contentHash }
        : { permalink, contentHash, id };
  }

  const redirects: RedirectRule[] = [];
  for (const raw of value.redirects) {
    if (!isRecord(raw)) return undefined;
    const { from, to, status, reason } = raw;
    if (typeof from !== "string" || typeof to !== "string") return undefined;
    if (!isRedirectStatus(status)) return undefined;
    if (reason !== "rename" && reason !== "id") return undefined;
    redirects.push({ from, to, status, reason });
  }

  return {
    version: LOCK_VERSION,
    routes: sortRoutes(routes),
    redirects: collapseRedirects(redirects),
  };
}

/**
 * Compares the previous lock with the current routes and returns the next lock
 * plus any rename redirects discovered in this build.
 *
 * Detection precedence is strict and never fuzzy:
 * 1. explicit identity (frontmatter `id`)
 * 2. exact content hash (`sha256(html)`)
 * 3. otherwise the route is treated as removed
 */
export function diffRoutes(
  previous: RouteLock,
  current: RouteLock,
  options: DiffRoutesOptions = {},
): DiffRoutesResult {
  const status = options.status ?? 308;
  const removalSeverity = options.onUnexpectedRemoval ?? "warning";
  const prev = parseRouteLock(previous) ?? emptyRouteLock();
  const curr = parseRouteLock(current) ?? emptyRouteLock();

  const added: RedirectRule[] = [];
  const diagnostics: RenameDiagnostic[] = [];

  // Candidates are current routes that are new or whose permalink changed.
  const candidates: Array<{ slug: string; route: RouteLockRoute }> = [];
  for (const slug of sortedKeys(curr.routes)) {
    const route = curr.routes[slug];
    if (!route) continue;
    const before = prev.routes[slug];
    if (before && before.permalink === route.permalink) continue;
    candidates.push({ slug, route });
  }

  const used = new Set<string>();

  for (const slug of sortedKeys(prev.routes)) {
    const before = prev.routes[slug];
    if (!before) continue;
    const after = curr.routes[slug];
    if (after && after.permalink === before.permalink) continue;

    const idMatches =
      before.id === undefined
        ? []
        : candidates.filter(
            (candidate) =>
              !used.has(candidate.slug) && candidate.route.id === before.id,
          );

    let matchedBy: "id" | "rename" | undefined;
    let match: { slug: string; route: RouteLockRoute } | undefined;
    let ambiguous = 0;

    if (idMatches.length === 1) {
      match = idMatches[0];
      matchedBy = "id";
    } else if (idMatches.length > 1) {
      ambiguous = idMatches.length;
    } else {
      const hashMatches = candidates.filter(
        (candidate) =>
          !used.has(candidate.slug) &&
          candidate.route.contentHash === before.contentHash,
      );
      if (hashMatches.length === 1) {
        match = hashMatches[0];
        matchedBy = "rename";
      } else if (hashMatches.length > 1) {
        ambiguous = hashMatches.length;
      }
    }

    if (match && matchedBy) {
      used.add(match.slug);
      if (match.route.permalink !== before.permalink) {
        added.push({
          from: before.permalink,
          to: match.route.permalink,
          status,
          reason: matchedBy,
        });
      }
      continue;
    }

    if (ambiguous > 0) {
      diagnostics.push({
        code: "rename-ambiguous",
        severity: "warning",
        message: `Cannot resolve the previous route "${before.permalink}" (slug "${slug}"): ${ambiguous} candidates share the same ${before.id === undefined ? "content hash" : "id"}.`,
        slug,
        suggestion:
          'Add a stable frontmatter "id" so the note can be identified after a rename.',
      });
      continue;
    }

    diagnostics.push({
      code: "rename-removed",
      severity: removalSeverity,
      message: `Route "${before.permalink}" (slug "${slug}") disappeared without rename evidence and was dropped from the route lock.`,
      slug,
    });
  }

  const lock: RouteLock = {
    version: LOCK_VERSION,
    routes: sortRoutes({ ...curr.routes }),
    redirects: collapseRedirects([
      ...prev.redirects,
      ...curr.redirects,
      ...added,
    ]),
  };

  return { lock, added, diagnostics };
}

/**
 * Merges redirect rules and collapses permanent chains: if `A -> B` is known
 * and `B -> C` is added, the result keeps `A -> C` and `B -> C`. Output is
 * sorted by `from` so the lock serializes deterministically.
 */
export function collapseRedirects(
  rules: readonly RedirectRule[],
): RedirectRule[] {
  const byFrom = new Map<string, RedirectRule>();
  for (const rule of rules) {
    if (!rule) continue;
    if (rule.from === rule.to) continue;
    byFrom.set(rule.from, { ...rule });
  }

  const collapsed: RedirectRule[] = [];
  for (const from of [...byFrom.keys()].sort()) {
    const first = byFrom.get(from);
    if (!first) continue;
    const visited = new Set<string>([from]);
    let to = first.to;
    while (!visited.has(to)) {
      const next = byFrom.get(to);
      if (!next) break;
      visited.add(to);
      to = next.to;
    }
    if (to === from) continue;
    collapsed.push({
      from,
      to,
      status: first.status,
      reason: first.reason,
    });
  }
  return collapsed;
}

export type ManifestRedirect = {
  path: string;
  status: RedirectStatus;
  slug: string;
};

export type RedirectSink = {
  redirects: Map<string, ManifestRedirect>;
  byPermalink: ReadonlyMap<string, { slug: string }>;
};

/**
 * Adds rename redirects to `manifest.redirects` without ever overwriting an
 * existing key (for example one declared through Permalink's `redirect_from`).
 * Redirects whose source is a live permalink, or whose target is unknown, are
 * skipped. Returns the rules that were actually applied.
 */
export function applyRouteRedirects(
  manifest: RedirectSink,
  rules: readonly RedirectRule[],
): RedirectRule[] {
  const applied: RedirectRule[] = [];
  for (const rule of rules) {
    if (manifest.redirects.has(rule.from)) continue;
    if (manifest.byPermalink.has(rule.from)) continue;
    const target = manifest.byPermalink.get(rule.to);
    if (!target) continue;
    manifest.redirects.set(rule.from, {
      path: rule.to,
      status: rule.status,
      slug: target.slug,
    });
    applied.push(rule);
  }
  return applied;
}

function readId(frontmatter: Record<string, unknown>): string | undefined {
  const value = frontmatter.id;
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  return id.length > 0 ? id : undefined;
}

function sortRoutes(
  routes: Record<string, RouteLockRoute>,
): Record<string, RouteLockRoute> {
  const sorted: Record<string, RouteLockRoute> = {};
  for (const slug of sortedKeys(routes)) {
    const route = routes[slug];
    if (route) sorted[slug] = route;
  }
  return sorted;
}

function sortedKeys(routes: Record<string, RouteLockRoute>): string[] {
  return Object.keys(routes).sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
