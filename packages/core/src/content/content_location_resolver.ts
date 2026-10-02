import type { Observability } from "../observability.js";
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
  readonly observability: Observability;
};

export class ContentLocationResolver {
  private locations: Map<string, ContentPublicLocation> | null = null;

  constructor(
    private readonly dependencies: ContentLocationResolverDependencies,
  ) {}

  async getLocations(): Promise<ReadonlyMap<string, ContentPublicLocation>> {
    if (this.locations) return this.locations;

    return await this.dependencies.observability.tracer.span(
      "content.locations",
      {},
      () => this.resolveLocations(),
    );
  }

  private async resolveLocations(): Promise<
    ReadonlyMap<string, ContentPublicLocation>
  > {
    const [entries, contentIndex] = await Promise.all([
      this.dependencies.getEntries(),
      this.dependencies.getContentIndex(),
    ]);
    await this.dependencies.pluginRuntime.startBuild(contentIndex);
    const inputs = await mapConcurrent(
      entries.filter((entry) => entry.path.endsWith(".md")),
      64,
      async (entry) => ({
        slug: toSlug(entry.path),
        path: entry.path,
        markdown: await this.dependencies.readEntry(entry),
      }),
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
    await this.dependencies.pluginRuntime.extendContentLocations(
      inputs,
      locations,
      contentIndex,
    );
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

async function mapConcurrent<T, U>(
  values: readonly T[],
  concurrency: number,
  map: (value: T) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];
      if (value !== undefined) results[index] = await map(value);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return results;
}
