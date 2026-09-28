import type { PluginRuntime } from "../plugin/plugin_runtime.js";
import type {
  ContentManifest,
  ContentPublicLocation,
} from "../types/content_manifest.js";
import { resolveDefaultContentLocation } from "./content_location.js";
import type { ContentSourceEntry } from "./content_source.js";

type ContentLocationResolverDependencies = {
  readonly getEntries: () => Promise<readonly ContentSourceEntry[]>;
  readonly readEntry: (entry: ContentSourceEntry) => Promise<string>;
  readonly getContentIndex: () => Promise<Map<string, string>>;
  readonly pluginRuntime: PluginRuntime;
};

export class ContentLocationResolver {
  private locations: Map<string, ContentPublicLocation> | null = null;

  constructor(
    private readonly dependencies: ContentLocationResolverDependencies,
  ) {}

  async getLocations(): Promise<ReadonlyMap<string, ContentPublicLocation>> {
    if (this.locations) return this.locations;

    const [entries, contentIndex] = await Promise.all([
      this.dependencies.getEntries(),
      this.dependencies.getContentIndex(),
    ]);
    await this.dependencies.pluginRuntime.startBuild(contentIndex);
    const inputs = await Promise.all(
      entries
        .filter((entry) => entry.path.endsWith(".md"))
        .map(async (entry) => ({
          slug: toSlug(entry.path),
          path: entry.path,
          markdown: await this.dependencies.readEntry(entry),
        })),
    );
    const locations = new Map(
      inputs.map((input) => [input.slug, resolveDefaultContentLocation(input)]),
    );
    for (const location of await this.dependencies.pluginRuntime.resolveContentLocations(
      inputs,
      contentIndex,
    )) {
      if (!locations.has(location.slug)) {
        throw new Error(
          `Content public location references an unknown slug: ${location.slug}`,
        );
      }
      locations.set(location.slug, location);
    }
    this.locations = locations;
    return locations;
  }

  async getPermalinks(): Promise<Map<string, string>> {
    return new Map(
      Array.from(
        (await this.getLocations()).entries(),
        ([slug, location]) => [slug, location.permalink] as const,
      ),
    );
  }

  populateRedirects(
    manifest: ContentManifest,
    locations: ReadonlyMap<string, ContentPublicLocation>,
  ): void {
    for (const [slug, location] of locations) {
      for (const redirect of location.redirects ?? []) {
        manifest.redirects.set(redirect.path, { ...redirect, slug });
      }
    }
  }
}

function toSlug(path: string): string {
  return path.replace(/\.md$/, "");
}
