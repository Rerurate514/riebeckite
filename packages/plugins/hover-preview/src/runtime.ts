import {
  type ContentManifest,
  type ContentManifestEntry,
  type DerivedView,
  type DerivedViewRegistry,
  defineDerivedView,
  type PlannedGeneratedOutput,
} from "@riebeckite/core";
import { buildPreviewIndex } from "./preview-index.js";
import {
  HOVER_PREVIEW_ATTRIBUTE,
  HOVER_PREVIEW_INDEX_PATH,
  hasInternalLink,
  renderHoverPreviewPayload,
} from "./render.js";
import type {
  HoverPreviewIndex,
  ResolvedHoverPreviewOptions,
} from "./types.js";

type PreviewIndexEntry = {
  readonly permalink: string;
  readonly slug: string;
  readonly title: string;
  readonly html: string;
};

type PreviewIndexInput = {
  readonly entries: readonly PreviewIndexEntry[];
  readonly excerptLength: number;
  readonly maxEntries: number | null;
};

type HoverPreviewRuntime = {
  readonly view: DerivedView<PreviewIndexInput, HoverPreviewIndex>;
  plan(
    entries: readonly ContentManifestEntry[],
    derived: DerivedViewRegistry,
  ): Promise<readonly PlannedGeneratedOutput[]>;
  inject(
    manifest: ContentManifest,
    shouldInclude?: (entry: ContentManifestEntry) => boolean,
  ): void;
};

export function createHoverPreviewRuntime(
  options: ResolvedHoverPreviewOptions,
): HoverPreviewRuntime {
  const view = defineDerivedView<PreviewIndexInput, HoverPreviewIndex>({
    id: "hover-preview.index",
    version: "hover-preview-v1",
    compute(input, context) {
      for (const entry of input.entries) {
        context.track({ type: "content", id: entry.slug });
      }
      return buildPreviewIndex(input.entries, {
        excerptLength: input.excerptLength,
        ...(input.maxEntries === null ? {} : { maxEntries: input.maxEntries }),
      });
    },
  });

  return {
    view,
    async plan(entries, derived) {
      const resolution = await derived.resolveWithDependencies(view, {
        entries: entries.map((entry) => ({
          permalink: entry.permalink,
          slug: entry.slug,
          title: entry.title,
          html: entry.html,
        })),
        excerptLength: options.excerptLength,
        maxEntries: options.maxEntries ?? null,
      });
      if (Object.keys(resolution.value).length === 0) return [];
      return [
        {
          path: HOVER_PREVIEW_INDEX_PATH,
          content: JSON.stringify(resolution.value),
          dependencies: [{ type: "global" }],
          derivedViewIds: resolution.viewIds,
        },
      ];
    },
    inject(manifest, shouldInclude) {
      const entries = shouldInclude
        ? manifest.entries.filter(shouldInclude)
        : manifest.entries;
      if (entries.length === 0) return;

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
