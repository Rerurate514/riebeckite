import type {
  CompletedContentBuildSnapshot,
  ContentManifestEntry,
} from "@riebeckite/core";
import {
  resolveBridgeSource,
  unavailable,
} from "./bridge_inspection_source.js";
import type { BridgeInspectionOptions } from "./bridge_inspection_types.js";

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
      publishAt: entry.publishing.publishAt?.toISOString() ?? null,
      publicLocation: entry.publicLocation,
      canonicalUrl: resolvePublicUrl(options.publicOrigin, entry.permalink),
      seo: publicationSeo(entry, options.publicOrigin),
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

export function resolvePublicUrl(
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

export function redirects(
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

export function publicationReasons(
  entry: ContentManifestEntry,
): readonly string[] {
  if (entry.publishing.visibility === "draft") return ["visibility is draft"];
  if (entry.publishing.visibility === "scheduled")
    return ["publishAt is after the build time"];
  if (entry.publishing.visibility === "unlisted")
    return ["visibility is unlisted"];
  return ["content is publishable at the build time"];
}

export function publicationSeo(
  entry: ContentManifestEntry,
  publicOrigin: string | undefined,
): Record<string, unknown> {
  const description =
    typeof entry.frontmatter.description === "string"
      ? entry.frontmatter.description
      : null;
  const indexable =
    entry.publishing.discoverable && entry.publishing.visibility === "public";
  const issues = [
    ...(description?.trim()
      ? []
      : [{ code: "MISSING_DESCRIPTION", message: "Description is missing." }]),
    ...(description !== null && description.length > 120
      ? [
          {
            code: "DESCRIPTION_TOO_LONG",
            message: "Description exceeds 120 characters.",
          },
        ]
      : []),
    ...(entry.title.length > 60
      ? [{ code: "TITLE_TOO_LONG", message: "Title exceeds 60 characters." }]
      : []),
    ...(indexable
      ? []
      : [{ code: "NOT_INDEXABLE", message: "Content is not indexable." }]),
  ];
  return {
    title: entry.title,
    description,
    canonicalUrl: resolvePublicUrl(publicOrigin, entry.permalink),
    indexable,
    issues,
  };
}
