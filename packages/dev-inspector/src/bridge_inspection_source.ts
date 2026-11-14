import path from "node:path";
import type {
  CompletedContentBuildSnapshot,
  ContentManifestEntry,
} from "@riebeckite/core";
import type { BridgeInspectionOptions } from "./bridge_inspection_types.js";

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
    ...snapshot.manifest.entries.filter(
      (entry) => entry.sourcePath === logicalPath,
    ),
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
    entry: serializeEntry(
      entry,
      entry.sourcePath ?? logicalPath ?? `${entry.slug}.md`,
    ),
    revision: options.revision,
  };
}

export function unavailable(revision: number): Record<string, unknown> {
  return { status: "unavailable", reason: "BUILD_UNAVAILABLE", revision };
}

export function toLogicalPath(
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

export function normalizeSourceKey(value: string): string {
  return value.replace(/\\/g, "/").replace(/\.md$/i, "").toLowerCase();
}

export function isContentPath(value: string): boolean {
  return !(
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.split(/[\\/]+/).some((part) => part === ".." || part === "")
  );
}

export function serializeEntry(
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
    publishAt: entry.publishing.publishAt?.toISOString() ?? null,
    redirects: entry.publicLocation.redirects ?? [],
  };
}

export function redirectEntry(
  snapshot: CompletedContentBuildSnapshot,
  input: string | undefined,
): ContentManifestEntry | undefined {
  if (!input) return undefined;
  const redirect = snapshot.manifest.redirects?.get(input);
  return redirect ? snapshot.manifest.bySlug.get(redirect.slug) : undefined;
}
