import type {
  ContentManifest,
  ContentManifestEntry,
  PostContent,
} from "@riebeckite/core";
import { buildPreviewIndex } from "./preview-index.js";
import {
  HOVER_PREVIEW_ATTRIBUTE,
  hasInternalLink,
  renderHoverPreviewPayload,
} from "./render.js";
import type { ResolvedHoverPreviewOptions } from "./types.js";

export type HoverPreviewRuntime = {
  track(slug: string, content: PostContent): void;
  inject(
    manifest: ContentManifest,
    shouldInclude?: (entry: ContentManifestEntry) => boolean,
  ): void;
};

export function createHoverPreviewRuntime(
  options: ResolvedHoverPreviewOptions,
): HoverPreviewRuntime {
  const tracked = new Map<string, PostContent>();

  return {
    track(slug, content) {
      tracked.set(slug, content);
    },
    inject(manifest, shouldInclude) {
      const entries = shouldInclude
        ? manifest.entries.filter(shouldInclude)
        : manifest.entries;
      const index = buildPreviewIndex(entries, {
        excerptLength: options.excerptLength,
        ...(options.maxEntries === undefined
          ? {}
          : { maxEntries: options.maxEntries }),
      });
      if (Object.keys(index).length === 0) return;

      const payload = renderHoverPreviewPayload(index, options);
      for (const entry of entries) {
        if (!hasInternalLink(entry.html)) continue;
        if (entry.html.includes(HOVER_PREVIEW_ATTRIBUTE)) continue;

        const html = `${entry.html}${payload}`;
        entry.html = html;
        const content = tracked.get(entry.slug);
        if (content) content.html = html;
      }
    },
  };
}
