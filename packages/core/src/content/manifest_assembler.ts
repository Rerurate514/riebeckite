import type {
  ContentManifest,
  ContentManifestEntry,
} from "../types/content_manifest.js";
import type { PostContent } from "../types/post_content.js";
import type { PublishStrategy } from "../types/publish_strategy.js";
import { ManifestBuilder } from "./manifest_builder.js";
import { resolvePublishingState } from "./publishing.js";

export class ManifestAssembler {
  private readonly builder = new ManifestBuilder();

  constructor(private readonly contentCache: Map<string, PostContent>) {}

  createEntry(
    ...args: Parameters<ManifestBuilder["createEntry"]>
  ): ContentManifestEntry {
    return this.builder.createEntry(...args);
  }

  build(...args: Parameters<ManifestBuilder["build"]>): ContentManifest {
    return this.builder.build(...args);
  }

  applyPublicView(
    manifest: ContentManifest,
    strategy: PublishStrategy,
    publishingBuildTime: Date,
  ): void {
    for (const entry of manifest.entries) {
      entry.publishing = resolvePublishingState(entry.frontmatter, {
        strategy,
        buildTime: publishingBuildTime,
      });
    }
    manifest.publicEntries = manifest.entries.filter(
      (entry) => entry.publishing.routable,
    );
    manifest.discoverableEntries = manifest.entries.filter(
      (entry) => entry.publishing.discoverable,
    );

    const publicSlugs = new Set(
      manifest.publicEntries.map((entry) => entry.slug),
    );
    const publicPermalinks = new Map(
      manifest.publicEntries.map((entry) => [entry.permalink, entry]),
    );
    manifest.byRoutablePermalink = publicPermalinks;
    manifest.publicRedirects = new Map(
      [...manifest.redirects].filter(([, redirect]) =>
        publicSlugs.has(redirect.slug),
      ),
    );
  }

  synchronizeHtml(
    manifest: ContentManifest,
    preHookEntries: readonly ContentManifestEntry[],
  ): void {
    const preHookHtml = new Map(
      preHookEntries.map((entry) => [entry.slug, entry.html]),
    );
    for (const entry of manifest.entries) {
      const changed = preHookHtml.get(entry.slug) !== entry.html;
      const cached = this.contentCache.get(entry.slug);
      if (cached) {
        if (changed) cached.html = entry.html;
        continue;
      }
      this.contentCache.set(entry.slug, {
        frontmatter: entry.frontmatter,
        html: entry.html,
      });
    }
  }
}
