import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { buildPreviewIndex } from "./preview-index.js";
import {
  HOVER_PREVIEW_ATTRIBUTE,
  hasInternalLink,
  renderHoverPreviewPayload,
} from "./render.js";
import type { ResolvedHoverPreviewOptions } from "./types.js";

export type HoverPreviewRuntime = {
  inject(
    manifest: ContentManifest,
    shouldInclude?: (entry: ContentManifestEntry) => boolean,
  ): void;
};

export function createHoverPreviewRuntime(
  options: ResolvedHoverPreviewOptions,
): HoverPreviewRuntime {
  return {
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

        entry.html = `${entry.html}${payload}`;
      }
    },
  };
}
