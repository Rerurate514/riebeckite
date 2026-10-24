import type { ContentIcon } from "../types/content_icon.js";
import type {
  ContentLink,
  ContentManifest,
  ContentManifestEntry,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import type { ResolvedPublishingState } from "./publishing.js";

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

export type PublicContentEntry = DeepReadonly<{
  slug: string;
  contentId?: string;
  permalink: string;
  publicLocation: ContentPublicLocation;
  title: string;
  aliases?: readonly string[];
  icon?: ContentIcon;
  publishing: ResolvedPublishingState;
  tags: string[];
  links: ContentLink[];
  assets: ContentManifestEntry["assets"];
}>;

export type PublicContentView = {
  readonly routableEntries: readonly PublicContentEntry[];
  readonly discoverableEntries: readonly PublicContentEntry[];
  findRoutableBySlug(slug: string): PublicContentEntry | undefined;
  findDiscoverableBySlug(slug: string): PublicContentEntry | undefined;
  findRoutableByAlias(alias: string): readonly PublicContentEntry[];
  getDiscoverableEntriesByTag(tag: string): readonly PublicContentEntry[];
  getDiscoverableOutgoing(slug: string): readonly PublicContentEntry[];
  getDiscoverableIncoming(slug: string): readonly PublicContentEntry[];
  getDiscoverableNeighbors(slug: string): readonly PublicContentEntry[];
};

const emptyEntries: readonly PublicContentEntry[] = Object.freeze([]);

export function createPublicContentView(
  manifest: ContentManifest,
): PublicContentView {
  const routableEntries = manifest.entries.filter(
    (entry) => entry.publishing.routable,
  );
  const discoverableEntries = routableEntries.filter(
    (entry) => entry.publishing.discoverable,
  );
  const routableSlugs = new Set(routableEntries.map((entry) => entry.slug));
  const copiesBySlug = new Map(
    routableEntries.map((entry) => [
      entry.slug,
      copyEntry(entry, routableSlugs),
    ]),
  );
  const discoverableSlugs = new Set(
    discoverableEntries.map((entry) => entry.slug),
  );
  const routableCopies = routableEntries
    .map((entry) => copiesBySlug.get(entry.slug))
    .filter(isDefined);
  const discoverableCopies = discoverableEntries
    .map((entry) => copiesBySlug.get(entry.slug))
    .filter(isDefined);
  const aliases = createAliasIndex(routableCopies);
  const tags = createTagIndex(discoverableCopies);

  const getDiscoverableRelated = (
    relatedSlugs: readonly string[],
  ): readonly PublicContentEntry[] =>
    Object.freeze(
      relatedSlugs
        .filter((relatedSlug) => discoverableSlugs.has(relatedSlug))
        .map((relatedSlug) => copiesBySlug.get(relatedSlug))
        .filter(isDefined),
    );

  return Object.freeze({
    routableEntries: Object.freeze(routableCopies),
    discoverableEntries: Object.freeze(discoverableCopies),
    findRoutableBySlug: (slug) => copiesBySlug.get(slug),
    findDiscoverableBySlug: (slug) =>
      discoverableSlugs.has(slug) ? copiesBySlug.get(slug) : undefined,
    findRoutableByAlias: (alias) =>
      aliases.get(alias.toLowerCase()) ?? emptyEntries,
    getDiscoverableEntriesByTag: (tag) => tags.get(tag) ?? emptyEntries,
    getDiscoverableOutgoing: (slug) =>
      getDiscoverableRelated(manifest.graph.outgoingSlugs(slug)),
    getDiscoverableIncoming: (slug) =>
      getDiscoverableRelated(manifest.graph.incomingSlugs(slug)),
    getDiscoverableNeighbors: (slug) =>
      getDiscoverableRelated(manifest.graph.neighborSlugs(slug)),
  });
}

function copyEntry(
  entry: ContentManifestEntry,
  routableSlugs: ReadonlySet<string>,
): PublicContentEntry {
  return deepFreeze(
    structuredClone({
      slug: entry.slug,
      ...(entry.contentId === undefined ? {} : { contentId: entry.contentId }),
      permalink: entry.permalink,
      publicLocation: entry.publicLocation,
      title: entry.title,
      ...(entry.aliases === undefined ? {} : { aliases: entry.aliases }),
      ...(entry.icon === undefined ? {} : { icon: entry.icon }),
      publishing: {
        visibility: entry.publishing.visibility,
        routable: entry.publishing.routable,
        discoverable: entry.publishing.discoverable,
      },
      tags: entry.tags,
      links: entry.links.filter(
        (link) =>
          link.kind !== "note" ||
          link.slug === null ||
          routableSlugs.has(link.slug),
      ),
      assets: entry.assets,
    }),
  );
}

function createAliasIndex(
  entries: readonly PublicContentEntry[],
): ReadonlyMap<string, readonly PublicContentEntry[]> {
  const aliases = new Map<string, PublicContentEntry[]>();
  for (const entry of entries) {
    for (const alias of entry.aliases ?? []) {
      const matches = aliases.get(alias.toLowerCase()) ?? [];
      matches.push(entry);
      aliases.set(alias.toLowerCase(), matches);
    }
  }
  return new Map(
    [...aliases].map(([alias, entries]) => [alias, Object.freeze(entries)]),
  );
}

function createTagIndex(
  entries: readonly PublicContentEntry[],
): ReadonlyMap<string, readonly PublicContentEntry[]> {
  const tags = new Map<string, PublicContentEntry[]>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      const taggedEntries = tags.get(tag) ?? [];
      taggedEntries.push(entry);
      tags.set(tag, taggedEntries);
    }
  }
  return new Map(
    [...tags].map(([tag, entries]) => [tag, Object.freeze(entries)]),
  );
}

function deepFreeze<Value>(value: Value): DeepReadonly<Value> {
  if (value === null || typeof value !== "object") {
    return value as DeepReadonly<Value>;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value) as DeepReadonly<Value>;
}

function isDefined<Value>(value: Value | undefined): value is Value {
  return value !== undefined;
}
