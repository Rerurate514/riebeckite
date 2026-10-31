import crypto from "node:crypto";
import type { PublishingVisibility } from "../content/publishing.js";
import type { ContentManifest } from "../types/content_manifest.js";

export type PublicationEntry = {
  readonly slug: string;
  readonly permalink: string;
  readonly title: string;
  readonly visibility: PublishingVisibility;
  readonly publishAt?: string;
  /**
   * Fingerprint of the content plus its publication state. It changes when a
   * note is edited, moved, or crosses a `publishAt` boundary.
   */
  readonly fingerprint: string;
  /**
   * Fingerprint of the content identity only. Approval records bind to this
   * value so a scheduled note does not need re-approval when its time arrives.
   */
  readonly contentFingerprint: string;
};

export type PublicationOutput = {
  readonly path: string;
  readonly fingerprint: string;
};

export type PublicationRedirect = {
  readonly from: string;
  readonly to: string;
  readonly status: 301 | 302 | 307 | 308;
};

export type PublicationSnapshot = {
  readonly runId: string;
  readonly publishedAt: string;
  readonly publicationFingerprint: string;
  readonly entries: readonly PublicationEntry[];
  readonly redirects: readonly PublicationRedirect[];
  readonly artifactFingerprint?: string;
  readonly provider?: string;
};

export function publicationEntriesFromManifest(
  manifest: Pick<ContentManifest, "entries">,
): PublicationEntry[] {
  return manifest.entries
    .map(publicationEntryFromManifestEntry)
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

export function publicationEntryFromManifestEntry(
  entry: ContentManifest["entries"][number],
): PublicationEntry {
  const publishAt = entry.publishing.publishAt?.toISOString();
  const identity = {
    slug: entry.slug,
    permalink: entry.permalink,
    title: entry.title,
    html: entry.html,
    redirects: entry.publicLocation.redirects ?? [],
  };
  return {
    slug: entry.slug,
    permalink: entry.permalink,
    title: entry.title,
    visibility: entry.publishing.visibility,
    ...(publishAt === undefined ? {} : { publishAt }),
    fingerprint: hashJson({
      ...identity,
      visibility: entry.publishing.visibility,
      publishAt: publishAt ?? null,
    }),
    contentFingerprint: hashJson(identity),
  };
}

export function publicationOutputsFromManifest(
  manifest: Pick<ContentManifest, "generatedOutputs">,
): PublicationOutput[] {
  return manifest.generatedOutputs
    .map((output) => ({
      path: output.path,
      fingerprint: crypto
        .createHash("sha256")
        .update(output.content)
        .digest("hex"),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function publicationRedirectsFromManifest(
  manifest: Pick<ContentManifest, "publicRedirects" | "bySlug">,
): PublicationRedirect[] {
  const redirects: PublicationRedirect[] = [];
  for (const [from, redirect] of manifest.publicRedirects) {
    const target = manifest.bySlug.get(redirect.slug)?.permalink;
    if (target === undefined) continue;
    redirects.push({ from, to: target, status: redirect.status });
  }
  return redirects.sort((left, right) => left.from.localeCompare(right.from));
}

export function isDeployableEntry(entry: PublicationEntry): boolean {
  return entry.visibility === "public" || entry.visibility === "unlisted";
}

export function publicationFingerprint(
  entries: readonly PublicationEntry[],
  redirects: readonly PublicationRedirect[] = [],
  outputs: readonly PublicationOutput[] = [],
): string {
  return hashJson({
    entries: entries
      .filter(isDeployableEntry)
      .map((entry) => ({
        slug: entry.slug,
        permalink: entry.permalink,
        title: entry.title,
        visibility: entry.visibility,
        fingerprint: entry.fingerprint,
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug)),
    redirects: [...redirects].sort((left, right) =>
      left.from.localeCompare(right.from),
    ),
    outputs: [...outputs].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
  });
}

export function hashJson(value: unknown): string {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function parsePublicationSnapshot(
  value: unknown,
): PublicationSnapshot | undefined {
  if (
    !isRecord(value) ||
    typeof value.runId !== "string" ||
    typeof value.publishedAt !== "string" ||
    Number.isNaN(Date.parse(value.publishedAt)) ||
    typeof value.publicationFingerprint !== "string" ||
    !Array.isArray(value.entries) ||
    !value.entries.every(isPublicationEntry) ||
    !Array.isArray(value.redirects)
  ) {
    return undefined;
  }
  return value as unknown as PublicationSnapshot;
}

function isPublicationEntry(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.slug === "string" &&
    typeof value.permalink === "string" &&
    typeof value.title === "string" &&
    (value.visibility === "public" ||
      value.visibility === "unlisted" ||
      value.visibility === "scheduled" ||
      value.visibility === "draft") &&
    typeof value.fingerprint === "string" &&
    typeof value.contentFingerprint === "string" &&
    (value.publishAt === undefined || typeof value.publishAt === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  }
  return value;
}
