import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
} from "@riebeckite/core";

const PLUGIN_NAME = "diagnostics";

const DEFAULT_SEVERITY: Record<string, DiagnosticSeverity> = {
  "content-integrity:broken-link": "warning",
  "content-integrity:unresolved-wikilink": "warning",
  "content-integrity:ambiguous-wikilink": "warning",
  "content-integrity:broken-asset": "warning",
  "content-integrity:duplicate-public-location": "error",
  "content-integrity:redirect-target-missing": "warning",
  "content-integrity:redirect-cycle": "error",
  "content-integrity:redirect-public-location-conflict": "error",
  "content-integrity:ambiguous-folder-page-owner": "warning",
};

export type SiteIntegrityOptions = {
  readonly severity?: Partial<Record<DiagnosticCode, DiagnosticSeverity>>;
};

type RouteOwner = {
  readonly path: string;
  readonly slug: string;
  readonly kind: "content" | "redirect" | "page";
  readonly producer?: string;
};

export function checkSiteIntegrity(
  manifest: ContentManifest,
  options: SiteIntegrityOptions = {},
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const publicSlugs = new Set(
    manifest.publicEntries.map((entry) => entry.slug),
  );
  const routeOwners = buildRouteOwners(manifest, diagnostics, options);
  const publicRoutes = new Set(routeOwners.keys());
  const assetPaths = buildAssetPaths(manifest);
  const noteSlugs = new Set(manifest.entries.map((entry) => entry.slug));
  const ambiguities = manifest.contentIndexAmbiguities ?? new Map();

  for (const entry of manifest.publicEntries) {
    checkResolvedLinks(
      entry,
      publicSlugs,
      assetPaths,
      noteSlugs,
      ambiguities,
      diagnostics,
      options,
    );
    checkHtmlReferences(entry, publicRoutes, assetPaths, diagnostics, options);
  }

  checkRedirectTargets(manifest, diagnostics, options);
  checkRedirectCycles(manifest, diagnostics, options);
  checkAmbiguousFolderPageOwners(manifest, diagnostics, options);

  return diagnostics;
}

function buildRouteOwners(
  manifest: ContentManifest,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): Map<string, RouteOwner> {
  const owners = new Map<string, RouteOwner>();

  for (const entry of manifest.publicEntries) {
    reserveRoute(owners, diagnostics, options, {
      path: normalizeRoutePath(entry.publicLocation.permalink),
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
  const pageRoutes = manifest.pageRoutes ?? [];
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

function reserveRoute(
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

function checkResolvedLinks(
  entry: ContentManifestEntry,
  publicSlugs: ReadonlySet<string>,
  assetPaths: ReadonlySet<string>,
  noteSlugs: ReadonlySet<string>,
  ambiguities: ReadonlyMap<string, readonly string[]>,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): void {
  for (const link of entry.links) {
    if (link.kind === "unresolved") {
      const ambiguity = ambiguities.get(link.raw.toLowerCase());
      if (ambiguity && ambiguity.length > 0) {
        diagnostics.push(
          createAmbiguousWikilinkDiagnostic(
            entry,
            link.raw,
            link.embed,
            ambiguity,
            noteSlugs,
            publicSlugs,
            options,
          ),
        );
        continue;
      }
      diagnostics.push(
        diagnostic(options, {
          code: "content-integrity:unresolved-wikilink",
          slug: entry.slug,
          filePath: `${entry.slug}.md`,
          target: link.raw,
          message: `WikiLink target "${link.raw}" could not be resolved.`,
          suggestion:
            "Create the target note/asset or update the WikiLink target.",
          meta: { raw: link.raw, embed: link.embed },
        }),
      );
      continue;
    }

    if (link.kind === "note" && link.slug && !publicSlugs.has(link.slug)) {
      diagnostics.push(
        diagnostic(options, {
          code: "content-integrity:broken-link",
          slug: entry.slug,
          filePath: `${entry.slug}.md`,
          target: link.slug,
          message: `Content link "${link.raw}" resolves to unpublished content "${link.slug}".`,
          suggestion:
            "Publish the target content or remove the reference from published content.",
          meta: {
            raw: link.raw,
            resolvedSlug: link.slug,
            reason: "unpublished-target",
          },
        }),
      );
    }

    if (
      (link.kind === "image" || link.kind === "attachment") &&
      link.slug &&
      !assetPaths.has(link.slug)
    ) {
      diagnostics.push(
        diagnostic(options, {
          code: "content-integrity:broken-asset",
          slug: entry.slug,
          filePath: `${entry.slug}.md`,
          target: link.slug,
          message: `Asset reference "${link.raw}" resolves to "${link.slug}", but no asset is published for that path.`,
          suggestion:
            "Add the asset, fix the reference, or register the generated asset from a plugin.",
          meta: { raw: link.raw, resolvedPath: link.slug },
        }),
      );
    }
  }
}

function createAmbiguousWikilinkDiagnostic(
  entry: ContentManifestEntry,
  raw: string,
  embed: boolean,
  candidates: readonly string[],
  noteSlugs: ReadonlySet<string>,
  publicSlugs: ReadonlySet<string>,
  options: SiteIntegrityOptions,
): Diagnostic {
  const visible: string[] = [];
  let unpublishedCount = 0;
  for (const candidate of candidates) {
    if (!noteSlugs.has(candidate)) {
      visible.push(candidate);
      continue;
    }
    if (publicSlugs.has(candidate)) visible.push(candidate);
    else unpublishedCount += 1;
  }

  const described = [...visible];
  if (unpublishedCount > 0)
    described.push(`${unpublishedCount} unpublished candidate(s)`);
  const first = visible[0];
  const suggestion = first
    ? `Use an explicit path such as [[${first}]].`
    : "Rename one of the duplicate targets or reference it by a unique path.";

  return diagnostic(options, {
    code: "content-integrity:ambiguous-wikilink",
    slug: entry.slug,
    filePath: `${entry.slug}.md`,
    target: raw,
    message: `WikiLink target "${raw}" matches multiple candidates: ${described.join(", ")}.`,
    suggestion,
    meta: {
      raw,
      embed,
      candidates: visible,
      ...(unpublishedCount > 0
        ? { unpublishedCandidateCount: unpublishedCount }
        : {}),
    },
  });
}

function checkHtmlReferences(
  entry: ContentManifestEntry,
  publicRoutes: ReadonlySet<string>,
  assetPaths: ReadonlySet<string>,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): void {
  for (const href of extractAttributes(entry.html, "href")) {
    if (!isSiteLocalReference(href)) continue;
    const path = normalizeReferencePath(href, entry.publicLocation.permalink);
    if (!path || publicRoutes.has(path)) continue;
    diagnostics.push(
      diagnostic(options, {
        code: "content-integrity:broken-link",
        slug: entry.slug,
        filePath: entry.publicLocation.permalink,
        target: href,
        message: `Internal link target "${href}" does not match a public route.`,
        suggestion:
          "Update the link, create the target content, or register the generated route from a plugin.",
        meta: { normalizedTarget: path },
      }),
    );
  }

  for (const src of extractAttributes(entry.html, "src")) {
    if (!isSiteLocalReference(src)) continue;
    const path = normalizeReferencePath(src, entry.publicLocation.permalink);
    const assetPath = path?.replace(/^\/+/, "");
    if (
      !path ||
      publicRoutes.has(path) ||
      (assetPath && assetPaths.has(assetPath))
    )
      continue;
    diagnostics.push(
      diagnostic(options, {
        code: "content-integrity:broken-asset",
        slug: entry.slug,
        filePath: entry.publicLocation.permalink,
        target: src,
        message: `Local asset target "${src}" does not match a published asset or route.`,
        suggestion:
          "Add the asset, fix the reference, or register the generated asset from a plugin.",
        meta: { normalizedTarget: path },
      }),
    );
  }
}

function checkRedirectTargets(
  manifest: ContentManifest,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): void {
  for (const [path, redirect] of manifest.redirects) {
    const owner = manifest.bySlug.get(redirect.slug);
    const target = owner
      ? normalizeRoutePath(owner.publicLocation.permalink)
      : null;
    if (
      target &&
      manifest.byRoutablePermalink.get(target)?.slug === redirect.slug
    )
      continue;
    diagnostics.push(
      diagnostic(options, {
        code: "content-integrity:redirect-target-missing",
        slug: redirect.slug,
        target: path,
        message: `Redirect "${path}" points to content "${redirect.slug}", but its public target is not available.`,
        suggestion: "Publish the target content or remove the redirect.",
        meta: { redirect: path, targetSlug: redirect.slug, target },
      }),
    );
  }
}

function checkRedirectCycles(
  manifest: ContentManifest,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): void {
  const redirectTargets = new Map<string, string>();
  const reportedCycles = new Set<string>();
  for (const [path, redirect] of manifest.publicRedirects) {
    const owner = manifest.bySlug.get(redirect.slug);
    if (owner)
      redirectTargets.set(
        normalizeRoutePath(path),
        normalizeRoutePath(owner.publicLocation.permalink),
      );
  }

  for (const start of redirectTargets.keys()) {
    const seen = new Map<string, number>();
    const chain: string[] = [];
    let current: string | undefined = start;
    while (current) {
      const previousIndex = seen.get(current);
      if (previousIndex !== undefined) {
        const cycle = [...chain.slice(previousIndex), current];
        const key = canonicalCycleKey(cycle);
        if (reportedCycles.has(key)) break;
        reportedCycles.add(key);
        diagnostics.push(
          diagnostic(options, {
            code: "content-integrity:redirect-cycle",
            target: cycle.join(" -> "),
            message: `Redirect cycle detected: ${cycle.join(" -> ")}.`,
            suggestion: "Remove or retarget one redirect in the cycle.",
            meta: { cycle },
          }),
        );
        break;
      }
      seen.set(current, chain.length);
      chain.push(current);
      current = redirectTargets.get(current);
    }
  }
}

function buildAssetPaths(manifest: ContentManifest): Set<string> {
  const paths = new Set<string>();
  for (const entry of manifest.entries) {
    for (const asset of entry.assets) paths.add(asset.path);
  }
  for (const asset of manifest.assets ?? [])
    paths.add(asset.path.replace(/^\/+/, ""));
  return paths;
}

function extractAttributes(html: string, attribute: "href" | "src"): string[] {
  const pattern = new RegExp(
    `${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "gi",
  );
  const values: string[] = [];
  for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) values.push(value);
  }
  return values;
}

function isSiteLocalReference(value: string): boolean {
  if (!value || value.startsWith("#") || value.startsWith("//")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  return true;
}

function normalizeReferencePath(
  value: string,
  basePath: string,
): string | null {
  const path = value.split(/[?#]/)[0] ?? "";
  if (!path || path === "/") return path || null;
  try {
    return normalizeRoutePath(resolveReferencePath(decodeURI(path), basePath));
  } catch {
    return null;
  }
}

function resolveReferencePath(path: string, basePath: string): string {
  if (path.startsWith("/")) return path;
  const baseSegments = basePath.split("/").filter(Boolean);
  if (!basePath.endsWith("/")) baseSegments.pop();
  const segments = [...baseSegments, ...path.split("/")];
  const normalized: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(segment);
  }
  return `/${normalized.join("/")}`;
}

function normalizeRoutePath(value: string): string {
  const path = `/${value.split(/[?#]/)[0]?.split("/").filter(Boolean).join("/") ?? ""}`;
  return path === "/" ? path : path.replace(/\/$/, "");
}

function describeOwner(owner: RouteOwner): string {
  return `${owner.kind} "${owner.producer ?? owner.slug}"`;
}

function checkAmbiguousFolderPageOwners(
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

function canonicalCycleKey(cycle: readonly string[]): string {
  const closed = cycle.at(0) === cycle.at(-1) ? cycle.slice(0, -1) : [...cycle];
  const rotations = closed.map((_, index) => [
    ...closed.slice(index),
    ...closed.slice(0, index),
  ]);
  return rotations.map((rotation) => rotation.join("\u0000")).sort()[0] ?? "";
}

function diagnostic(
  options: SiteIntegrityOptions,
  input: Omit<Diagnostic, "pluginName" | "severity"> & {
    severity?: DiagnosticSeverity;
  },
): Diagnostic {
  return {
    pluginName: PLUGIN_NAME,
    severity:
      options.severity?.[input.code] ??
      input.severity ??
      DEFAULT_SEVERITY[input.code] ??
      "warning",
    ...input,
  };
}
