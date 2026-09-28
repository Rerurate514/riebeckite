import type {
  ContentManifest,
  PostContent,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { isPublished } from "@riebeckite/core";
import { buildPreviewIndex } from "./preview-index.js";
import {
  HOVER_PREVIEW_ATTRIBUTE,
  hasInternalLink,
  renderHoverPreviewPayload,
} from "./render.js";
import type { ResolvedHoverPreviewOptions } from "./types.js";

export type HoverPreviewRuntime = {
  track(slug: string, content: PostContent): void;
  inject(manifest: ContentManifest, config?: ResolvedRiebeckiteConfig): void;
};

export function createHoverPreviewRuntime(
  options: ResolvedHoverPreviewOptions,
): HoverPreviewRuntime {
  const tracked = new Map<string, PostContent>();

  return {
    track(slug, content) {
      tracked.set(slug, content);
    },
    inject(manifest, config) {
      const published = manifest.entries.filter(
        (entry) => config === undefined || isPublished(config, entry.frontmatter),
      );
      const index = buildPreviewIndex(published, {
        excerptLength: options.excerptLength,
        ...(options.maxEntries === undefined
          ? {}
          : { maxEntries: options.maxEntries }),
      });
      if (Object.keys(index).length === 0) return;

      const payload = renderHoverPreviewPayload(index, options);
      for (const entry of published) {
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
