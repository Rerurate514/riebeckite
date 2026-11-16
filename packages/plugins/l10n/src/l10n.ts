import {
  createStyleAsset,
  definePlugin,
  type JsonValue,
  toJsonValue,
} from "@riebeckite/core";
import { detectContents, throwForStrictDiagnostics } from "./detection.js";
import { addLocalizationHeadTags } from "./head_tags.js";
import { l10nInspectorTabs } from "./inspector.js";
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
  DetectedContent,
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
    developmentRouteManifest: true,
    developmentRouteCache: {
      version: "l10n-route-v1",
      serialize: () => serializeState(state),
      restore: (snapshot) => {
        state = restoreState(snapshot);
      },
    },
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
    resolveContentLocalization: () => ({
      defaultLocale: resolved.defaultLang,
      locales: resolved.languages,
      ...(resolved.fallbackLocale
        ? { fallbackLocale: resolved.fallbackLocale }
        : {}),
    }),
    onManifestCreated: ({ manifest }) => {
      addLocalizationHeadTags(manifest, state);
      for (const route of manifest.pageRoutes) {
        const slug = state.slugsByPermalink.get(route.pathname);
        if (!slug) continue;
        state.diagnostics.push({
          code: "L10N_PAGE_PATH_CONFLICT",
          severity: "warning",
          pluginName: route.pluginName,
          slug,
          message: `Generated page ${route.pathname} collides with the permalink of ${slug}.`,
          meta: { pathname: route.pathname, slug, plugin: route.pluginName },
        });
      }
    },
    addDiagnostics: () => state.diagnostics,
    inspector: {
      apiVersion: 1,
      tabs: l10nInspectorTabs(() => state, resolved),
    },
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

function serializeState(state: L10nState): JsonValue {
  return (
    toJsonValue({
      contents: [...state.contents.values()],
      diagnostics: state.diagnostics,
      conflictedGroups: [...state.conflictedGroups],
      locations: state.locations ? [...state.locations] : null,
      slugsByPermalink: [...state.slugsByPermalink],
      signatures: [...state.signatures],
    }) ?? null
  );
}

function restoreState(snapshot: JsonValue): L10nState {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.contents)) {
    throw new Error("Invalid l10n development route cache.");
  }
  const conflictedGroups = new Set(stringValues(snapshot.conflictedGroups));
  const contents = new Map<string, DetectedContent>();
  const contentsByTranslationAndLanguage = new Map<string, DetectedContent>();
  for (const value of snapshot.contents) {
    if (
      !isRecord(value) ||
      typeof value.slug !== "string" ||
      typeof value.path !== "string" ||
      typeof value.lang !== "string" ||
      typeof value.translationId !== "string" ||
      !isRecord(value.frontmatter) ||
      !isRecord(value.signals)
    ) {
      throw new Error("Invalid l10n development route cache.");
    }
    const content = value as DetectedContent;
    contents.set(content.slug, content);
    const key = `${content.translationId}\u0000${content.lang}`;
    if (!conflictedGroups.has(key)) {
      contentsByTranslationAndLanguage.set(key, content);
    }
  }
  return {
    contents,
    contentsByTranslationAndLanguage,
    diagnostics: Array.isArray(snapshot.diagnostics)
      ? (snapshot.diagnostics as L10nState["diagnostics"])
      : [],
    conflictedGroups,
    locations:
      snapshot.locations === null
        ? null
        : new Map(
            pairValues(snapshot.locations) as [
              string,
              L10nState["locations"] extends ReadonlyMap<string, infer T>
                ? T
                : never,
            ][],
          ),
    slugsByPermalink: new Map(
      pairValues(snapshot.slugsByPermalink) as [string, string][],
    ),
    signatures: new Map(pairValues(snapshot.signatures) as [string, string][]),
  };
}

function pairValues(value: JsonValue | undefined): [string, JsonValue][] {
  if (!Array.isArray(value))
    throw new Error("Invalid l10n development route cache.");
  return value.map((item) => {
    if (!Array.isArray(item) || typeof item[0] !== "string") {
      throw new Error("Invalid l10n development route cache.");
    }
    return [item[0], item[1] ?? null];
  });
}

function stringValues(value: JsonValue | undefined): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error("Invalid l10n development route cache.");
  }
  return value;
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
