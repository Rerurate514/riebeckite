import type {
  ContentManifest,
  ContentManifestEntry,
  PlannedGeneratedOutput,
} from "@riebeckite/core";
import { buildPreviewIndex } from "./preview-index.js";
import {
  HOVER_PREVIEW_ATTRIBUTE,
  HOVER_PREVIEW_INDEX_PATH,
  hasInternalLink,
  renderHoverPreviewPayload,
} from "./render.js";
import type { ResolvedHoverPreviewOptions } from "./types.js";

type HoverPreviewRuntime = {
  plan(
    entries: readonly ContentManifestEntry[],
  ): readonly PlannedGeneratedOutput[];
  inject(
    manifest: ContentManifest,
    shouldInclude?: (entry: ContentManifestEntry) => boolean,
  ): void;
};

export function createHoverPreviewRuntime(
  options: ResolvedHoverPreviewOptions,
): HoverPreviewRuntime {
  return {
    plan(entries) {
      const index = buildPreviewIndex(entries, {
        excerptLength: options.excerptLength,
        ...(options.maxEntries === undefined
          ? {}
          : { maxEntries: options.maxEntries }),
      });
      if (Object.keys(index).length === 0) return [];
      return [
        {
          path: HOVER_PREVIEW_INDEX_PATH,
          content: JSON.stringify(index),
          dependencies: [{ type: "global" }],
        },
      ];
    },
    inject(manifest, shouldInclude) {
      const entries = shouldInclude
        ? manifest.entries.filter(shouldInclude)
        : manifest.entries;
      if (this.plan(entries).length === 0) return;

      const payload = renderHoverPreviewPayload(
        options,
        `/${HOVER_PREVIEW_INDEX_PATH}`,
      );
      for (const entry of entries) {
        if (!hasInternalLink(entry.html)) continue;
        if (entry.html.includes(HOVER_PREVIEW_ATTRIBUTE)) continue;

        entry.html = `${entry.html}${payload}`;
      }
    },
  };
}
