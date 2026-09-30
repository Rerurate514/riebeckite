import {
  appendContentBodySlot,
  type ContentBodySlot,
  type ContentLocationInput,
  type ContentManifest,
  type ContentManifestEntry,
  type ContentPublicLocation,
  createStyleAsset,
  type Diagnostic,
  definePlugin,
  type PostFrontmatter,
} from "@riebeckite/core";
import { parse } from "yaml";
import { renderLanguageSwitcher } from "./language-switcher.js";

const LANGUAGE_METADATA_KEY = "l10n.lang";
const TRANSLATION_METADATA_KEY = "l10n.translationId";

export type L10nContent = {
  readonly path: string;
  readonly slug: string;
  readonly frontmatter: PostFrontmatter;
};

export type L10nDetectorContext = L10nContent & {
  readonly filenameLanguage: string | undefined;
  readonly directoryLanguage: string | undefined;
};

/** A detector may provide a language and/or an explicit translation identity. */
export type L10nDetectorResult = {
  readonly lang?: string;
  readonly translationId?: string;
};

export type L10nOptions = {
  defaultLang: string;
  languages: readonly string[];
  strict?: boolean;
  detect?: (content: L10nDetectorContext) => L10nDetectorResult | undefined;
  /**
   * Publishes the built-in switcher into a standard article layout slot.
   * Pass `false` to keep localization metadata and URLs without UI.
   */
  ui?: L10nUiOptions;
};

export type L10nUiOptions =
  | false
  | {
      /** Defaults to the standard `article.after-meta` slot. */
      slot?: ContentBodySlot;
      /** Replaces the built-in server-rendered LanguageSwitcher. */
      render?: (context: LanguageSwitcherRenderContext) => string | null;
    };

export type LocalizedContent = {
  readonly slug: string;
  readonly permalink: string;
  readonly lang: string;
  readonly translationId: string;
  readonly availableLanguages: readonly string[];
  readonly translations: Readonly<Record<string, string>>;
};

export type LanguageSwitcherRenderContext = {
  readonly localization: LocalizedContent;
};

type ResolvedUiOptions =
  | false
  | {
      readonly slot: ContentBodySlot;
      readonly render: (
        context: LanguageSwitcherRenderContext,
      ) => string | null;
    };

type DetectedContent = L10nContent & {
  readonly lang: string;
  readonly translationId: string;
  readonly signals: Readonly<Record<string, string>>;
};

type L10nState = {
  readonly contents: ReadonlyMap<string, DetectedContent>;
  readonly diagnostics: Diagnostic[];
  readonly conflictedGroups: ReadonlySet<string>;
};

export function l10n(options: L10nOptions) {
  const resolved = resolveOptions(options);
  let state: L10nState = emptyState();

  return definePlugin({
    name: "l10n",
    options,
    assets: [createStyleAsset("l10n")],
    validateOptions: () =>
      validateOptions(options).map((message) => ({ path: "l10n", message })),
    extendContentLocations: ({ entries, locations }) => {
      state = detectContents(entries, resolved);
      throwForStrictDiagnostics(state.diagnostics, resolved.strict);

      for (const content of state.contents.values()) {
        const location = locations.get(content.slug);
        if (!location) continue;
        locations.set(
          content.slug,
          withLocalization(location, content, resolved),
        );
      }
    },
    extendContentGraph: ({ entries }) => {
      for (const entry of entries) {
        const source = state.contents.get(entry.slug);
        if (!source) continue;
        entry.links = entry.links.map((link) => {
          if (!link.slug) return link;
          const target = state.contents.get(link.slug);
          if (!target) return link;
          const localized = findTranslation(
            state,
            target.translationId,
            source.lang,
          );
          return localized
            ? { ...link, kind: "note", slug: localized.slug }
            : { ...link, kind: "note" };
        });
      }
    },
    onManifestCreated: ({ manifest }) => {
      addLocalizationHeadTags(manifest, state);
      addLanguageSwitchers(manifest, resolved.ui);
    },
    addDiagnostics: () => state.diagnostics,
  });
}

export const l10nPlugin = l10n;

/** Returns one entry's language and available real translations. */
export function getLocalization(
  manifest: ContentManifest,
  slug: string,
): LocalizedContent | null {
  const entry = manifest.bySlug.get(slug);
  if (!entry) return null;
  const lang = entry.publicLocation.metadata?.[LANGUAGE_METADATA_KEY];
  const translationId =
    entry.publicLocation.metadata?.[TRANSLATION_METADATA_KEY];
  if (!lang || !translationId) return null;

  const candidates = manifest.entries.filter(
    (candidate) =>
      candidate.publicLocation.metadata?.[TRANSLATION_METADATA_KEY] ===
      translationId,
  );
  const translations = Object.fromEntries(
    uniqueLanguageEntries(candidates).map((candidate) => [
      candidate.publicLocation.metadata?.[LANGUAGE_METADATA_KEY] ?? "",
      candidate.permalink,
    ]),
  );

  return {
    slug,
    permalink: entry.permalink,
    lang,
    translationId,
    availableLanguages: Object.keys(translations).sort(),
    translations,
  };
}

/** Resolves an existing translation; missing translations return `null`. */
export function getLocalizedContent(
  manifest: ContentManifest,
  slug: string,
  lang: string,
): ContentManifestEntry | null {
  const localization = getLocalization(manifest, slug);
  if (!localization) return null;
  const candidates = manifest.entries.filter(
    (entry) =>
      entry.publicLocation.metadata?.[TRANSLATION_METADATA_KEY] ===
        localization.translationId &&
      entry.publicLocation.metadata?.[LANGUAGE_METADATA_KEY] === lang,
  );
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

function resolveOptions(options: L10nOptions) {
  const validation = validateOptions(options);
  if (validation.length > 0) throw new Error(validation.join("\n"));
  const languages = options.languages.map((language) =>
    canonicalLanguage(language),
  );
  return {
    defaultLang: canonicalLanguage(options.defaultLang),
    languages,
    languageByLowercase: new Map(
      languages.map((language) => [language.toLowerCase(), language]),
    ),
    strict: options.strict ?? false,
    detect: options.detect,
    ui: resolveUiOptions(options.ui),
  };
}

function validateOptions(options: L10nOptions): string[] {
  if (!options || typeof options !== "object")
    return ["l10n options are required."];
  if (!Array.isArray(options.languages) || options.languages.length === 0) {
    return ["l10n.languages must contain at least one language."];
  }
  const errors: string[] = [];
  const languages: string[] = [];
  for (const language of options.languages) {
    try {
      languages.push(canonicalLanguage(language));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  try {
    const defaultLang = canonicalLanguage(options.defaultLang);
    if (!languages.includes(defaultLang)) {
      errors.push("l10n.defaultLang must be included in l10n.languages.");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  if (new Set(languages).size !== languages.length) {
    errors.push("l10n.languages must not contain duplicate language tags.");
  }
  if (options.strict !== undefined && typeof options.strict !== "boolean") {
    errors.push("l10n.strict must be a boolean.");
  }
  if (options.detect !== undefined && typeof options.detect !== "function") {
    errors.push("l10n.detect must be a function.");
  }
  if (options.ui !== undefined && options.ui !== false) {
    if (typeof options.ui !== "object") {
      errors.push("l10n.ui must be false or an object.");
    } else if (
      options.ui.slot !== undefined &&
      (typeof options.ui.slot !== "string" || !options.ui.slot.trim())
    ) {
      errors.push("l10n.ui.slot must be a non-empty string.");
    } else if (
      options.ui.render !== undefined &&
      typeof options.ui.render !== "function"
    ) {
      errors.push("l10n.ui.render must be a function.");
    }
  }
  return errors;
}

function resolveUiOptions(ui: L10nUiOptions | undefined): ResolvedUiOptions {
  if (ui === false) return false;
  return {
    slot: ui?.slot ?? "article.after-meta",
    render: ui?.render ?? renderLanguageSwitcher,
  };
}

function canonicalLanguage(value: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("A l10n language tag must be a non-empty string.");
  }
  try {
    return Intl.getCanonicalLocales(value.trim())[0] ?? value.trim();
  } catch {
    throw new Error(`Invalid l10n language tag: ${value}`);
  }
}

function detectContents(
  entries: readonly ContentLocationInput[],
  options: ReturnType<typeof resolveOptions>,
): L10nState {
  const contents = new Map<string, DetectedContent>();
  const diagnostics: Diagnostic[] = [];
  const owners = new Map<string, DetectedContent>();
  const conflictedGroups = new Set<string>();

  for (const entry of entries) {
    const frontmatter = parseFrontmatter(entry);
    const filenameLanguage = detectFilenameLanguage(
      entry.path,
      options.languageByLowercase,
    );
    const directoryLanguage = detectDirectoryLanguage(
      entry.path,
      options.languageByLowercase,
    );
    const detectorContext: L10nDetectorContext = {
      path: entry.path,
      slug: entry.slug,
      frontmatter,
      filenameLanguage,
      directoryLanguage,
    };
    const custom = options.detect?.(detectorContext);
    const frontmatterLanguage = configuredLanguage(
      frontmatter.lang,
      options.languageByLowercase,
    );
    const signals = compactSignals({
      custom: configuredLanguage(custom?.lang, options.languageByLowercase),
      frontmatter: frontmatterLanguage,
      filename: filenameLanguage,
      directory: directoryLanguage,
    });
    addUnknownLanguageDiagnostic(
      diagnostics,
      entry,
      frontmatter.lang,
      "frontmatter",
      options,
    );
    addUnknownLanguageDiagnostic(
      diagnostics,
      entry,
      custom?.lang,
      "custom detector",
      options,
    );
    if (new Set(Object.values(signals)).size > 1) {
      diagnostics.push(conflictDiagnostic(entry, signals, options.strict));
    }

    const lang =
      signals.frontmatter ??
      signals.custom ??
      signals.filename ??
      signals.directory ??
      options.defaultLang;
    const translationId =
      readTranslationId(custom?.translationId ?? frontmatter.translation) ??
      deriveTranslationId(entry.path, filenameLanguage, directoryLanguage);
    const content: DetectedContent = {
      path: entry.path,
      slug: entry.slug,
      frontmatter,
      lang,
      translationId,
      signals,
    };
    contents.set(content.slug, content);
    const key = `${translationId}\u0000${lang}`;
    const previous = owners.get(key);
    if (previous) {
      conflictedGroups.add(key);
      diagnostics.push(duplicateDiagnostic(previous, content, options.strict));
    } else {
      owners.set(key, content);
    }
  }
  return { contents, diagnostics, conflictedGroups };
}

function parseFrontmatter(entry: ContentLocationInput): PostFrontmatter {
  const match = entry.markdown.match(
    /^(?:\uFEFF)?---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/,
  );
  if (!match) return {};
  const value = parse(match[1] ?? "");
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid frontmatter object: ${entry.path}`);
  }
  return value as PostFrontmatter;
}

function detectFilenameLanguage(
  path: string,
  languages: ReadonlyMap<string, string>,
): string | undefined {
  const filename = path.split("/").at(-1)?.replace(/\.md$/i, "") ?? "";
  for (const [lowercase, language] of languages) {
    if (
      filename.toLowerCase().endsWith(`.${lowercase}`) ||
      filename.toLowerCase().endsWith(`-${lowercase}`) ||
      filename.toLowerCase().endsWith(`_${lowercase}`)
    )
      return language;
  }
  return undefined;
}

function detectDirectoryLanguage(
  path: string,
  languages: ReadonlyMap<string, string>,
): string | undefined {
  const first = path.split("/")[0]?.toLowerCase();
  return first ? languages.get(first) : undefined;
}

function configuredLanguage(
  value: unknown,
  languages: ReadonlyMap<string, string>,
): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return languages.get(canonicalLanguage(value).toLowerCase());
  } catch {
    return undefined;
  }
}

function deriveTranslationId(
  path: string,
  filenameLanguage: string | undefined,
  directoryLanguage: string | undefined,
): string {
  const parts = path.replace(/\.md$/i, "").split("/");
  if (directoryLanguage) parts.shift();
  const last = parts.pop() ?? "";
  const language = filenameLanguage?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  parts.push(
    language ? last.replace(new RegExp(`[._-]${language}$`, "i"), "") : last,
  );
  return parts.join("/");
}

function readTranslationId(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("l10n translation frontmatter must be a non-empty string.");
  }
  return value.trim();
}

function withLocalization(
  location: ContentPublicLocation,
  content: DetectedContent,
  options: ReturnType<typeof resolveOptions>,
): ContentPublicLocation {
  const unlocalizedPermalink = removeLocalePathSegments(
    location.permalink,
    content,
  );
  const permalink =
    content.lang === options.defaultLang
      ? unlocalizedPermalink
      : prefixLanguage(unlocalizedPermalink, content.lang);
  return {
    ...location,
    permalink,
    metadata: {
      ...location.metadata,
      [LANGUAGE_METADATA_KEY]: content.lang,
      [TRANSLATION_METADATA_KEY]: content.translationId,
    },
  };
}

function removeLocalePathSegments(
  permalink: string,
  content: DetectedContent,
): string {
  let result = permalink;
  const filenameLanguage = content.signals.filename;
  if (filenameLanguage) {
    const suffix = new RegExp(`([._-])${escapeRegExp(filenameLanguage)}$`, "i");
    result = result.replace(suffix, "");
  }
  const directoryLanguage = content.signals.directory;
  if (directoryLanguage) {
    result = result.replace(
      new RegExp(`^/${escapeRegExp(directoryLanguage)}(?=/|$)`, "i"),
      "",
    );
  }
  return result || "/";
}

function prefixLanguage(permalink: string, language: string): string {
  const suffix = permalink === "/" ? "" : permalink;
  return `/${language}${suffix}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findTranslation(
  state: L10nState,
  translationId: string,
  lang: string,
): DetectedContent | null {
  const key = `${translationId}\u0000${lang}`;
  if (state.conflictedGroups.has(key)) return null;
  return (
    [...state.contents.values()].find(
      (content) =>
        content.translationId === translationId && content.lang === lang,
    ) ?? null
  );
}

function addLocalizationHeadTags(
  manifest: ContentManifest,
  state: L10nState,
): void {
  for (const entry of manifest.entries) {
    const content = state.contents.get(entry.slug);
    if (!content) continue;
    const translations = uniqueLanguageEntries(
      manifest.entries.filter(
        (candidate) =>
          candidate.publicLocation.metadata?.[TRANSLATION_METADATA_KEY] ===
          content.translationId,
      ),
    );
    entry.headTags = [
      ...(entry.headTags ?? []),
      ...translations.map((translation) => ({
        tag: "link" as const,
        attrs: {
          rel: "alternate",
          hreflang:
            translation.publicLocation.metadata?.[LANGUAGE_METADATA_KEY] ?? "",
          href: translation.permalink,
        },
      })),
    ];
  }
}

function addLanguageSwitchers(
  manifest: ContentManifest,
  ui: ResolvedUiOptions,
): void {
  if (ui === false) return;
  for (const entry of manifest.entries) {
    const localization = getLocalization(manifest, entry.slug);
    if (!localization) continue;
    const html = ui.render({ localization });
    if (html) appendContentBodySlot(entry, ui.slot, html);
  }
}

export { renderLanguageSwitcher } from "./language-switcher.js";

function uniqueLanguageEntries(
  entries: readonly ContentManifestEntry[],
): readonly ContentManifestEntry[] {
  return entries.filter((entry) => {
    const lang = entry.publicLocation.metadata?.[LANGUAGE_METADATA_KEY];
    return (
      lang !== undefined &&
      entries.filter(
        (other) =>
          other.publicLocation.metadata?.[LANGUAGE_METADATA_KEY] === lang,
      ).length === 1
    );
  });
}

function compactSignals(
  signals: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(signals).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

function conflictDiagnostic(
  entry: ContentLocationInput,
  signals: Readonly<Record<string, string>>,
  strict: boolean,
): Diagnostic {
  return {
    code: "L10N_LANGUAGE_CONFLICT",
    severity: strict ? "error" : "warning",
    filePath: entry.path,
    slug: entry.slug,
    message: `Conflicting localization metadata (${Object.entries(signals)
      .map(([source, language]) => `${source}: ${language}`)
      .join(
        ", ",
      )}); resolved to ${signals.frontmatter ?? signals.custom ?? signals.filename ?? signals.directory}.`,
    meta: {
      detected: signals,
      resolved:
        signals.frontmatter ??
        signals.custom ??
        signals.filename ??
        signals.directory,
    },
  };
}

function duplicateDiagnostic(
  first: DetectedContent,
  second: DetectedContent,
  strict: boolean,
): Diagnostic {
  return {
    code: "L10N_DUPLICATE_TRANSLATION",
    severity: strict ? "error" : "warning",
    filePath: second.path,
    slug: second.slug,
    message: `Both ${first.path} and ${second.path} claim translation "${second.translationId}" for ${second.lang}.`,
    meta: {
      translationId: second.translationId,
      lang: second.lang,
      first: first.path,
      second: second.path,
    },
  };
}

function addUnknownLanguageDiagnostic(
  diagnostics: Diagnostic[],
  entry: ContentLocationInput,
  value: unknown,
  source: string,
  options: ReturnType<typeof resolveOptions>,
): void {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    configuredLanguage(value, options.languageByLowercase)
  )
    return;
  diagnostics.push({
    code: "L10N_UNKNOWN_LANGUAGE",
    severity: options.strict ? "error" : "warning",
    filePath: entry.path,
    slug: entry.slug,
    message: `${source} language "${String(value)}" is not configured.`,
  });
}

function throwForStrictDiagnostics(
  diagnostics: readonly Diagnostic[],
  strict: boolean,
): void {
  if (
    !strict ||
    !diagnostics.some((diagnostic) => diagnostic.severity === "error")
  )
    return;
  throw new Error(
    diagnostics
      .filter((diagnostic) => diagnostic.severity === "error")
      .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
      .join("\n"),
  );
}

function emptyState(): L10nState {
  return { contents: new Map(), diagnostics: [], conflictedGroups: new Set() };
}
