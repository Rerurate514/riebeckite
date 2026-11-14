import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type { ExternalDependencySnapshot } from "../types/external_dependency.js";
import type {
  ContentBuildDependency,
  ContentBuildState,
  PersistedExternalDependency,
} from "./content_build_state.js";
import type { CachedContentDependency } from "./content_dependency_tracker.js";
import { LINK_LOCATION_PREFIX } from "./content_dependency_tracker.js";

export function externalDependenciesEqual(
  previous: readonly PersistedExternalDependency[],
  current: readonly ExternalDependencySnapshot[],
): boolean {
  if (previous.length !== current.length) return false;
  const currentById = new Map(
    current.map((dependency) => [dependency.id, dependency]),
  );
  return previous.every((dependency) => {
    const candidate = currentById.get(dependency.id);
    return (
      candidate !== undefined &&
      candidate.fingerprint === dependency.fingerprint &&
      candidate.expiresAt === dependency.expiresAt &&
      !isExpired(candidate.expiresAt)
    );
  });
}

export function isExpired(expiresAt: string | undefined): boolean {
  return expiresAt !== undefined && Date.parse(expiresAt) <= Date.now();
}

export function isPublishingStateExpired(
  state: ContentBuildState | undefined,
  buildTime: Date,
): boolean {
  return (
    state?.nextPublishingChangeAt !== undefined &&
    Date.parse(state.nextPublishingChangeAt) <= buildTime.getTime()
  );
}

export function nextPublishingChangeAt(
  manifest: ContentManifest,
  buildTime: Date,
): string | undefined {
  const next = manifest.entries
    .filter((entry) => entry.publishing.visibility === "scheduled")
    .map((entry) => entry.publishing.publishAt?.getTime())
    .filter(
      (time): time is number =>
        time !== undefined && time > buildTime.getTime(),
    )
    .reduce<number | undefined>(
      (earliest, time) =>
        earliest === undefined || time < earliest ? time : earliest,
      undefined,
    );
  return next === undefined ? undefined : new Date(next).toISOString();
}

export function readText(content: string | Uint8Array): string {
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

export function toSlug(path: string): string {
  return path.replace(/\.md$/, "");
}

export function collectDependencies(
  manifestEntry: ContentManifestEntry | undefined,
  trackedDependencies:
    | readonly CachedContentDependency[]
    | readonly ContentBuildDependency[],
  contentDependencies: readonly string[],
): ContentBuildDependency[] {
  if (!manifestEntry) return [];
  return [
    ...new Map(
      [
        ...manifestEntry.links
          .filter(
            (link): link is typeof link & { slug: string } =>
              link.slug !== null,
          )
          .map((link) => ({ kind: "content" as const, id: link.slug })),
        ...manifestEntry.assets.map((asset) => ({
          kind: "file" as const,
          id: asset.path.replace(/\\/g, "/"),
        })),
        ...trackedDependencies
          .map(toBuildDependency)
          .filter(
            (dependency): dependency is ContentBuildDependency =>
              dependency !== null,
          )
          .map((dependency) => ({
            kind: dependency.kind,
            id: dependency.id.replace(/\\/g, "/"),
          })),
        ...contentDependencies.map((id) => ({
          kind: "file" as const,
          id: id.replace(/\\/g, "/"),
        })),
      ].map((dependency) => [
        `${dependency.kind}:${dependency.id}`,
        dependency,
      ]),
    ).values(),
  ].toSorted((left, right) =>
    `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`),
  );
}

export function toBuildDependency(dependency: {
  readonly kind: "content" | "file" | "link";
  readonly id: string;
}): ContentBuildDependency | null {
  if (dependency.kind === "content" || dependency.kind === "file") {
    return { kind: dependency.kind, id: dependency.id };
  }
  if (dependency.id.startsWith(LINK_LOCATION_PREFIX)) {
    return {
      kind: "content",
      id: dependency.id.slice(LINK_LOCATION_PREFIX.length),
    };
  }
  return null;
}

export function collectLinkTargets(
  manifestEntry: ContentManifestEntry | undefined,
): string[] {
  if (!manifestEntry) return [];
  return [
    ...new Set(manifestEntry.links.map((link) => link.raw.toLowerCase())),
  ].sort();
}
