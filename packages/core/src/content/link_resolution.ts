import type { ContentManifestEntry } from "../types/content_manifest.js";
import type { LinkOccurrence } from "./link_occurrences.js";

export type LinkOccurrenceTarget = {
  readonly slug: string;
  readonly contentId?: string;
  readonly permalink?: string;
};

export type ResolvedLinkOccurrence = LinkOccurrence & {
  readonly target?: LinkOccurrenceTarget;
  readonly candidates?: readonly LinkOccurrenceTarget[];
};

export type LinkResolutionContext = {
  readonly contentIndex: ReadonlyMap<string, string>;
  readonly contentIndexAmbiguities?: ReadonlyMap<string, readonly string[]>;
  readonly entriesBySlug?: ReadonlyMap<string, ContentManifestEntry>;
};

export function resolveLinkOccurrences(
  occurrences: readonly LinkOccurrence[],
  context: LinkResolutionContext,
): readonly ResolvedLinkOccurrence[] {
  const definitions = new Map(
    occurrences
      .filter(
        (occurrence) =>
          occurrence.syntax === "reference-definition" &&
          occurrence.referenceLabel !== undefined,
      )
      .map((occurrence) => [occurrence.referenceLabel as string, occurrence]),
  );
  return occurrences.map((occurrence) =>
    resolveLinkOccurrence(
      occurrence,
      context,
      occurrence.syntax === "reference-link"
        ? definitions.get(occurrence.referenceLabel ?? "")
        : undefined,
    ),
  );
}

function resolveLinkOccurrence(
  occurrence: LinkOccurrence,
  context: LinkResolutionContext,
  definition?: LinkOccurrence,
): ResolvedLinkOccurrence {
  const targetOccurrence = definition ?? occurrence;
  if (occurrence.syntax === "reference-link" && !definition) {
    return { ...occurrence, reason: "reference-definition-not-found" };
  }
  const destination = targetOccurrence.normalizedDestination;
  if (!destination || externalDestination(destination)) {
    return { ...occurrence, resolution: "unsupported", reason: "external-url" };
  }
  const key = resolutionKey(targetOccurrence);
  if (!key) {
    return {
      ...occurrence,
      resolution: "unsupported",
      reason: "source-path-required",
    };
  }
  const resolved = context.contentIndex.get(key);
  if (resolved) {
    return {
      ...occurrence,
      resolution: "resolved",
      target: targetFor(resolved, context.entriesBySlug),
      evidence: definition ? "reference-definition" : "content-index",
    };
  }
  const candidates = context.contentIndexAmbiguities?.get(key);
  if (candidates?.length) {
    return {
      ...occurrence,
      resolution: "ambiguous",
      candidates: candidates.map((slug) =>
        targetFor(slug, context.entriesBySlug),
      ),
      reason: "ambiguous-content-index",
    };
  }
  return { ...occurrence, reason: "target-not-found" };
}

function resolutionKey(occurrence: LinkOccurrence): string | undefined {
  return linkResolutionKey(occurrence);
}

export function linkResolutionKey(
  occurrence: LinkOccurrence,
  sourcePath = occurrence.sourcePath,
): string | undefined {
  const destination = occurrence.normalizedDestination.split("#", 1)[0] ?? "";
  if (!destination) return undefined;
  if (occurrence.syntax === "wikilink" || occurrence.syntax === "wiki-embed") {
    return destination.toLowerCase();
  }
  if (!sourcePath) return undefined;
  const relative = destination.replaceAll("\\", "/");
  if (relative.startsWith("/")) return undefined;
  const directory = sourcePath.replaceAll("\\", "/").split("/").slice(0, -1);
  const segments: string[] = [];
  for (const segment of [...directory, ...relative.split("/")]) {
    if (!segment || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  const path = decodeDestination(segments.join("/"));
  return path.replace(/\.md$/i, "").toLowerCase();
}

function decodeDestination(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function externalDestination(destination: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(destination);
}

function targetFor(
  slug: string,
  entries: ReadonlyMap<string, ContentManifestEntry> | undefined,
): LinkOccurrenceTarget {
  const entry = entries?.get(slug);
  return {
    slug,
    ...(entry?.contentId ? { contentId: entry.contentId } : {}),
    ...(entry?.permalink ? { permalink: entry.permalink } : {}),
  };
}
