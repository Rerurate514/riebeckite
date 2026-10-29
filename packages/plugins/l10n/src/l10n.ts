import { createStyleAsset, definePlugin } from "@riebeckite/core";
import { detectContents, throwForStrictDiagnostics } from "./detection.js";
import { addLocalizationHeadTags } from "./head_tags.js";
import { resolveOptions, validateOptions } from "./options.js";
import {
  getLanguageFromPath,
  getLocalization,
  getLocalizedContent,
} from "./query.js";
import {
  remarkLocalizedLinks,
  resolveLocalizedTarget,
  withLocalization,
} from "./routing.js";
import { computeLocalizationSignatures } from "./signatures.js";
import type {
  L10nContent,
  L10nDetectorContext,
  L10nDetectorResult,
  L10nOptions,
  L10nState,
  LocalizedContent,
} from "./types.js";

export type {
  L10nContent,
  L10nDetectorContext,
  L10nDetectorResult,
  L10nOptions,
  LocalizedContent,
};
export { getLanguageFromPath, getLocalization, getLocalizedContent };

export function l10n(options: L10nOptions) {
  const resolved = resolveOptions(options);
  let state: L10nState = emptyState();

  return definePlugin({
    name: "l10n",
    processedContentCache: {
      version: "l10n-content-locations-v2",
      dependencyMode: "tracked",
      contentDependencyFingerprint: ({ slug }) => state.signatures.get(slug),
    },
    provides: ["content.localization"],
    options,
    assets: [createStyleAsset("l10n", "@riebeckite/plugin-l10n/style.css")],
    validateOptions: () =>
      validateOptions(options).map((message) => ({ path: "l10n", message })),
    extendContentLocations: ({ entries, locations, contentIndex }) => {
      state = {
        ...detectContents(entries, resolved),
        locations,
        slugsByPermalink: new Map(),
      };
      throwForStrictDiagnostics(state.diagnostics, resolved.strict);
      for (const content of state.contents.values()) {
        const location = locations.get(content.slug);
        if (!location) continue;
        locations.set(
          content.slug,
          withLocalization(location, content, resolved),
        );
      }
      const slugsByPermalink = new Map(
        [...locations].map(([slug, location]) => [location.permalink, slug]),
      );
      state = {
        ...state,
        slugsByPermalink,
        signatures: computeLocalizationSignatures(
          { ...state, slugsByPermalink },
          entries,
          contentIndex,
        ),
      };
    },
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(remarkLocalizedLinks, {
        state,
        sourceSlug: context.sourceSlug,
        resolvePermalink: context.resolvePermalink,
      });
    },
    extendContentGraph: ({ entries }) => {
      for (const entry of entries) {
        const source = state.contents.get(entry.slug);
        if (!source) continue;
        entry.links = entry.links.map((link) => {
          if (!link.slug) return link;
          const target = resolveLocalizedTarget(state, source, link.slug);
          return target ? { ...link, kind: "note", slug: target.slug } : link;
        });
      }
    },
    onManifestCreated: ({ manifest }) => {
      addLocalizationHeadTags(manifest, state);
    },
    addDiagnostics: () => state.diagnostics,
  });
}

function emptyState(): L10nState {
  return {
    contents: new Map(),
    contentsByTranslationAndLanguage: new Map(),
    diagnostics: [],
    conflictedGroups: new Set(),
    locations: null,
    slugsByPermalink: new Map(),
    signatures: new Map(),
  };
}
