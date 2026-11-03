import path from "node:path";
import type {
  CompletedContentBuildSnapshot,
  ContentManifestEntry,
} from "@riebeckite/core";

export type BridgeInspectionOptions = {
  readonly contentRoot?: string;
  readonly revision: number;
  readonly developmentOrigin?: string;
  readonly publicOrigin?: string;
};

export function resolveBridgeSource(
  snapshot: CompletedContentBuildSnapshot | undefined,
  input: string | null,
  options: BridgeInspectionOptions,
): Record<string, unknown> {
  if (!snapshot) return unavailable(options.revision);
  const logicalPath = toLogicalPath(input, options.contentRoot);
  const lookup = input?.trim();
  if (!logicalPath)
    return {
      status: "unsupported",
      reason: "INVALID_SOURCE_PATH",
      revision: options.revision,
    };
  const indexKeys = [
    ...new Set(
      [lookup, logicalPath]
        .filter(
          (key): key is string =>
            typeof key === "string" && key.length > 0 && isContentPath(key),
        )
        .map(normalizeSourceKey),
    ),
  ];
  const indexEntries = indexKeys
    .map((key) => snapshot.manifest.contentIndex?.get(key))
    .filter((slug): slug is string => slug !== undefined)
    .map((slug) => snapshot.manifest.bySlug.get(slug));
  const slug = logicalPath?.replace(/\.md$/i, "");
  const entries = [
    ...(slug ? [snapshot.manifest.bySlug.get(slug)] : []),
    ...indexEntries,
    snapshot.manifest.byContentId?.get(lookup ?? ""),
    snapshot.manifest.byPermalink?.get(lookup ?? ""),
    redirectEntry(snapshot, lookup),
    ...(snapshot.manifest.byAlias?.get(lookup ?? "") ?? []),
  ].filter((entry): entry is ContentManifestEntry => entry !== undefined);
  const unique = [
    ...new Map(entries.map((entry) => [entry.slug, entry])).values(),
  ];
  if (unique.length > 1)
    return {
      status: "unsupported",
      reason: "AMBIGUOUS_SOURCE",
      candidates: unique.map((entry) => entry.slug).toSorted(),
      revision: options.revision,
    };
  if (unique.length === 0) {
    const ambiguous = indexKeys
      .map((key) => snapshot.manifest.contentIndexAmbiguities?.get(key))
      .find((candidates) => candidates !== undefined);
    if (ambiguous)
      return {
        status: "unsupported",
        reason: "AMBIGUOUS_SOURCE",
        candidates: [...ambiguous].toSorted(),
        revision: options.revision,
      };
  }
  const entry = unique[0];
  if (!entry)
    return {
      status: "not-found",
      source: logicalPath ? { path: logicalPath } : undefined,
      revision: options.revision,
    };
  return {
    status: "resolved",
    entry: serializeEntry(entry, logicalPath ?? `${entry.slug}.md`),
    revision: options.revision,
  };
}

export function inspectBridgePage(
  snapshot: CompletedContentBuildSnapshot | undefined,
  input: string | null,
  options: BridgeInspectionOptions,
): Record<string, unknown> {
  if (!input || !isContentPath(input)) return { status: "invalid-source" };
  const resolved = resolveBridgeSource(snapshot, input, options);
  if (resolved.status === "unavailable") return { status: "unavailable" };
  if (resolved.status === "unsupported")
    return {
      status: "unsupported",
      source: input,
      reason: resolved.reason,
      candidates: resolved.candidates,
    };
  if (resolved.status !== "resolved" || !snapshot)
    return { status: "not-found", source: input };
  const entry = snapshot.manifest.bySlug.get(
    (resolved.entry as { slug: string }).slug,
  );
  if (!entry) return { status: "unavailable" };
  return {
    status: "resolved",
    source: input,
    page: entry.permalink,
    visibility: entry.publishing.visibility,
    routable: entry.publishing.routable,
    discoverable: entry.publishing.discoverable,
    locale: entry.publicLocation.language ?? null,
    publishAt: entry.publishing.publishAt?.toISOString() ?? null,
    revision: options.revision,
    productionUrl: resolvePublicUrl(options.publicOrigin, entry.permalink),
  };
}

function redirectEntry(
  snapshot: CompletedContentBuildSnapshot,
  input: string | undefined,
): ContentManifestEntry | undefined {
  if (!input) return undefined;
  const redirect = snapshot.manifest.redirects?.get(input);
  return redirect ? snapshot.manifest.bySlug.get(redirect.slug) : undefined;
}

export function inspectBridgePublication(
  snapshot: CompletedContentBuildSnapshot | undefined,
  input: string | null,
  options: BridgeInspectionOptions,
): Record<string, unknown> {
  const resolved = resolveBridgeSource(snapshot, input, options);
  if (resolved.status !== "resolved" || !snapshot) return resolved;
  const entry = snapshot.manifest.bySlug.get(
    (resolved.entry as { slug: string }).slug,
  );
  if (!entry) return unavailable(options.revision);
  return {
    ...resolved,
    publication: {
      visibility: entry.publishing.visibility,
      routable: entry.publishing.routable,
      discoverable: entry.publishing.discoverable,
      publishAt: entry.publishing.publishAt?.toISOString(),
      publicLocation: entry.publicLocation,
      canonicalUrl: undefined,
      redirects: redirects(snapshot, entry),
      reasons: publicationReasons(entry),
    },
  };
}

export function inspectBridgePreview(
  snapshot: CompletedContentBuildSnapshot | undefined,
  input: string | null,
  options: BridgeInspectionOptions,
): Record<string, unknown> {
  const resolved = resolveBridgeSource(snapshot, input, options);
  if (resolved.status !== "resolved" || !snapshot) return resolved;
  const entry = snapshot.manifest.bySlug.get(
    (resolved.entry as { slug: string }).slug,
  );
  if (!entry) return unavailable(options.revision);
  if (!entry.publishing.routable) {
    return {
      ...resolved,
      preview: { available: false, reason: "NOT_PUBLICLY_ROUTABLE" },
    };
  }
  if (!options.developmentOrigin) {
    return {
      ...resolved,
      preview: {
        available: false,
        reason: "DEVELOPMENT_SERVER_URL_UNAVAILABLE",
      },
    };
  }
  return {
    ...resolved,
    preview: {
      available: true,
      developmentUrl: new URL(
        entry.permalink,
        options.developmentOrigin,
      ).toString(),
      productionUrl: resolvePublicUrl(options.publicOrigin, entry.permalink),
    },
  };
}

export function inspectBridgeDiagnostics(
  snapshot: CompletedContentBuildSnapshot | undefined,
  input: string | null,
  options: BridgeInspectionOptions,
): Record<string, unknown> {
  const resolved = resolveBridgeSource(snapshot, input, options);
  if (resolved.status !== "resolved" || !snapshot) return resolved;
  const entry = resolved.entry as { slug: string; source: { path: string } };
  const diagnostics = [
    ...snapshot.manifest.diagnostics,
    ...snapshot.finalHtmlDiagnostics,
  ]
    .filter(
      (diagnostic) =>
        diagnostic.slug === entry.slug ||
        diagnostic.filePath === entry.source.path,
    )
    .map((diagnostic) => ({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
      category: "content",
      source:
        diagnostic.filePath || diagnostic.slug
          ? {
              path: diagnostic.filePath ?? entry.source.path,
              line: diagnostic.line,
              column: diagnostic.column,
            }
          : undefined,
      related: diagnostic.target ? [{ target: diagnostic.target }] : undefined,
      fix: diagnostic.suggestion
        ? { kind: "manual", description: diagnostic.suggestion }
        : undefined,
    }));
  return { ...resolved, diagnostics, revision: options.revision };
}

export function inspectBridgeImpact(
  snapshot: CompletedContentBuildSnapshot | undefined,
  input: string | null,
  options: BridgeInspectionOptions,
): Record<string, unknown> {
  const resolved = resolveBridgeSource(snapshot, input, options);
  if (resolved.status !== "resolved" || !snapshot) return resolved;
  const slug = (resolved.entry as { slug: string }).slug;
  const relevant = (output: {
    producer: string;
    dependencies: readonly { type: string; slug?: string }[];
  }) =>
    output.producer === `content:${slug}` ||
    output.dependencies.some(
      (dependency) => dependency.type === "content" && dependency.slug === slug,
    );
  const changes = snapshot.outputChangeSet;
  const serialize = (output: (typeof changes.affected)[number]) => ({
    ...output,
    reason: changes.reasons?.get(output.path) ?? { type: "unavailable" },
  });
  return {
    ...resolved,
    impact: {
      completeness: changes.fullRegenerationRequired ? "unknown" : "complete",
      kind: "last-build-result",
      affectedOutputs: changes.affected.filter(relevant).map(serialize),
      unchangedOutputs: changes.unchanged.filter(relevant).map(serialize),
      removedOutputs: changes.removed.filter(relevant).map(serialize),
      fullRegenerationRequired: changes.fullRegenerationRequired,
    },
  };
}

function unavailable(revision: number): Record<string, unknown> {
  return { status: "unavailable", reason: "BUILD_UNAVAILABLE", revision };
}

function toLogicalPath(
  input: string | null,
  contentRoot: string | undefined,
): string | undefined {
  if (!input || input.includes("\0")) return undefined;
  if (!contentRoot)
    return isContentPath(input) ? input.replace(/\\/g, "/") : undefined;
  const root = path.resolve(contentRoot);
  const absolute = path.resolve(root, input);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    return undefined;
  return relative.split(path.sep).join("/");
}

function normalizeSourceKey(value: string): string {
  return value.replace(/\\/g, "/").replace(/\.md$/i, "").toLowerCase();
}

function isContentPath(value: string): boolean {
  return !(
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.split(/[\\/]+/).some((part) => part === ".." || part === "")
  );
}

function resolvePublicUrl(
  origin: string | undefined,
  page: string,
): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" || url.protocol === "https:"
      ? new URL(page, url).toString()
      : null;
  } catch {
    return null;
  }
}

function serializeEntry(
  entry: ContentManifestEntry,
  logicalPath: string,
): Record<string, unknown> {
  return {
    slug: entry.slug,
    contentId: entry.contentId,
    source: { path: logicalPath },
    permalink: entry.permalink,
    locale: entry.publicLocation.language,
    visibility: entry.publishing.visibility,
    routable: entry.publishing.routable,
    discoverable: entry.publishing.discoverable,
    redirects: entry.publicLocation.redirects ?? [],
  };
}

function redirects(
  snapshot: CompletedContentBuildSnapshot,
  entry: ContentManifestEntry,
): readonly unknown[] {
  return [...(snapshot.manifest.redirects ?? [])]
    .filter(([, redirect]) => redirect.slug === entry.slug)
    .map(([from, redirect]) => ({
      from,
      to: redirect.path,
      status: redirect.status,
    }));
}

function publicationReasons(entry: ContentManifestEntry): readonly string[] {
  if (entry.publishing.visibility === "draft") return ["visibility is draft"];
  if (entry.publishing.visibility === "scheduled")
    return ["publishAt is after the build time"];
  if (entry.publishing.visibility === "unlisted")
    return ["visibility is unlisted"];
  return ["content is publishable at the build time"];
}
