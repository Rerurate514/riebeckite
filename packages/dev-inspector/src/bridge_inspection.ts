import path from "node:path";
import type {
  CompletedContentBuildSnapshot,
  ContentManifestEntry,
} from "@riebeckite/core";

export type BridgeInspectionOptions = {
  readonly contentRoot: string;
  readonly revision: number;
  readonly developmentOrigin?: string;
};

export function resolveBridgeSource(
  snapshot: CompletedContentBuildSnapshot | undefined,
  input: string | null,
  options: BridgeInspectionOptions,
): Record<string, unknown> {
  if (!snapshot) return unavailable(options.revision);
  const logicalPath = toLogicalPath(input, options.contentRoot);
  if (!logicalPath)
    return {
      status: "unsupported",
      reason: "INVALID_SOURCE_PATH",
      revision: options.revision,
    };
  const slug = logicalPath.replace(/\.md$/i, "");
  const entry = snapshot.manifest.bySlug.get(slug);
  if (!entry)
    return {
      status: "not-found",
      source: { path: logicalPath },
      revision: options.revision,
    };
  return {
    status: "resolved",
    entry: serializeEntry(entry, logicalPath),
    revision: options.revision,
  };
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
      productionUrl: undefined,
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
  contentRoot: string,
): string | undefined {
  if (!input || input.includes("\0")) return undefined;
  const root = path.resolve(contentRoot);
  const absolute = path.resolve(root, input);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    return undefined;
  return relative.split(path.sep).join("/");
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
  return [...snapshot.manifest.redirects.entries()]
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
