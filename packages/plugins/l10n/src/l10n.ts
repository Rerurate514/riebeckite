import {
  attachErrorPath,
  type ContentLocationInput,
  type ContentManifest,
  type ContentManifestEntry,
  type ContentPublicLocation,
  createStyleAsset,
  type Diagnostic,
  definePlugin,
  escapeRegExp,
  extractContentLinks,
  extractMarkdownLinkUrls,
  type PluginHeadTag,
  type PostFrontmatter,
  type PublicContentEntry,
  type PublicContentView,
} from "@riebeckite/core";
import { parse } from "yaml";

const TRANSLATION_METADATA_KEY = "l10n.translationId";

export type L10nContent = {
  readonly path: string;
  readonly slug: string;
  readonly frontmatter: PostFrontmatter;
};

export type L10nDetectorContext = L10nContent & {
  readonly filenameLanguage: string | undefined;
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
  translationKey?: string;
  detect?: (content: L10nDetectorContext) => L10nDetectorResult | undefined;
};

export type LocalizedContent = {
  readonly slug: string;
  readonly permalink: string;
  readonly lang: string;
  readonly translationId: string;
  readonly availableLanguages: readonly string[];
  readonly translations: Readonly<Record<string, string>>;
};

type DetectedContent = L10nContent & {
  readonly lang: string;
  readonly translationId: string;
  readonly signals: Readonly<Record<string, string>>;
};

type L10nState = {
  readonly contents: ReadonlyMap<string, DetectedContent>;
  readonly contentsByTranslationAndLanguage: ReadonlyMap<
    string,
    DetectedContent
  >;
  readonly diagnostics: Diagnostic[];
  readonly conflictedGroups: ReadonlySet<string>;
  readonly locations: ReadonlyMap<string, ContentPublicLocation> | null;
  readonly slugsByPermalink: ReadonlyMap<string, string>;
  readonly signatures: ReadonlyMap<string, string>;
};

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

export const l10nPlugin = l10n;

type LocalizedLinkOptions = {
  readonly state: L10nState;
  readonly sourceSlug: string | undefined;
  readonly resolvePermalink: (slug: string) => string;
};

type MarkdownNode = {
  readonly type?: string;
  url?: string;
  readonly children?: MarkdownNode[];
};

function remarkLocalizedLinks(options: LocalizedLinkOptions) {
  return (tree: MarkdownNode) => {
    const source = options.sourceSlug
      ? options.state.contents.get(options.sourceSlug)
      : undefined;
    if (!source || !options.state.locations) return;

    localizeLinks(tree, source, options, options.state.slugsByPermalink);
  };
}

function localizeLinks(
  node: MarkdownNode,
  source: DetectedContent,
  options: LocalizedLinkOptions,
  slugsByPermalink: ReadonlyMap<string, string>,
): void {
  if (node.type === "link" && node.url) {
    node.url = localizeLinkUrl(node.url, source, options, slugsByPermalink);
  }
  for (const child of node.children ?? []) {
    localizeLinks(child, source, options, slugsByPermalink);
  }
}

function localizeLinkUrl(
  url: string,
  source: DetectedContent,
  options: LocalizedLinkOptions,
  slugsByPermalink: ReadonlyMap<string, string>,
): string {
  const { permalink, suffix } = splitLinkUrl(url);
  const targetSlug = slugsByPermalink.get(permalink);
  if (!targetSlug) return url;

  const target = resolveLocalizedTarget(options.state, source, targetSlug);
  return target ? `${options.resolvePermalink(target.slug)}${suffix}` : url;
}

function splitLinkUrl(url: string): { permalink: string; suffix: string } {
  const suffixIndex = url.search(/[?#]/);
  return suffixIndex < 0
    ? { permalink: url, suffix: "" }
    : { permalink: url.slice(0, suffixIndex), suffix: url.slice(suffixIndex) };
}

/** Returns one entry's language and available real translations. */
export function getLocalization(
  view: ContentManifest | PublicContentView,
  slug: string,
): LocalizedContent | null {
  const entry = findLocalizedEntry(view, slug);
  if (!entry) return null;
  const lang = entry.publicLocation.language;
  const translationId =
    entry.publicLocation.metadata?.[TRANSLATION_METADATA_KEY];
  if (!lang || !translationId) return null;

  const candidates = getLocalizedDiscoverableEntries(view).filter(
    (candidate) =>
      candidate.publicLocation.metadata?.[TRANSLATION_METADATA_KEY] ===
      translationId,
  );
  const translations = Object.fromEntries(
    uniqueLanguageEntries(candidates).map((candidate) => [
      candidate.publicLocation.language ?? "",
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

function findLocalizedEntry(
  view: ContentManifest | PublicContentView,
  slug: string,
): ContentManifestEntry | PublicContentEntry | undefined {
  return "findRoutableBySlug" in view
    ? view.findRoutableBySlug(slug)
    : view.bySlug.get(slug);
}

function getLocalizedDiscoverableEntries(
  view: ContentManifest | PublicContentView,
): readonly (ContentManifestEntry | PublicContentEntry)[] {
  return view.discoverableEntries;
}

/** Resolves an existing translation; missing translations return `null`. */
export function getLocalizedContent(
  manifest: ContentManifest,
  slug: string,
  lang: string,
): ContentManifestEntry | null {
  const localization = getLocalization(manifest, slug);
  if (!localization) return null;
  const candidates = manifest.publicEntries.filter(
    (entry) =>
      entry.publicLocation.metadata?.[TRANSLATION_METADATA_KEY] ===
        localization.translationId && entry.publicLocation.language === lang,
  );
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

export function getLanguageFromPath(
  manifest: ContentManifest,
  pathname: string,
): string | undefined {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) return undefined;
  return manifest.discoverableEntries
    .map((entry) => entry.publicLocation.language)
    .find(
      (language) =>
        language?.toLocaleLowerCase() === firstSegment.toLocaleLowerCase(),
    );
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
    translationKey: (options.translationKey ?? "translation").trim(),
    detect: options.detect,
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
  if (
    options.translationKey !== undefined &&
    (typeof options.translationKey !== "string" ||
      !options.translationKey.trim())
  ) {
    errors.push("l10n.translationKey must be a non-empty string.");
  }
  if (options.detect !== undefined && typeof options.detect !== "function") {
    errors.push("l10n.detect must be a function.");
  }
  return errors;
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
  const contentsByTranslationAndLanguage = new Map<string, DetectedContent>();
  const diagnostics: Diagnostic[] = [];
  const owners = new Map<string, DetectedContent>();
  const conflictedGroups = new Set<string>();

  for (const entry of entries) {
    const frontmatter = parseFrontmatter(entry);
    const filenameLanguage = detectFilenameLanguage(
      entry.path,
      options.languageByLowercase,
    );
    const detectorContext: L10nDetectorContext = {
      path: entry.path,
      slug: entry.slug,
      frontmatter,
      filenameLanguage,
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
      options.defaultLang;
    const translationId =
      readTranslationId(
        custom?.translationId ?? frontmatter[options.translationKey],
      ) ?? deriveTranslationId(entry.path, filenameLanguage);
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
      contentsByTranslationAndLanguage.set(key, content);
    }
  }
  return {
    contents,
    contentsByTranslationAndLanguage,
    diagnostics,
    conflictedGroups,
    locations: null,
    slugsByPermalink: new Map(),
    signatures: new Map(),
  };
}

function parseFrontmatter(entry: ContentLocationInput): PostFrontmatter {
  const match = entry.markdown.match(
    /^(?:\uFEFF)?---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/,
  );
  if (!match) return {};
  let value: unknown;
  try {
    value = parse(match[1] ?? "");
  } catch (error) {
    throw attachErrorPath(error, entry.path);
  }
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
): string {
  const parts = path.replace(/\.md$/i, "").split("/");
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
  const permalink = localizePath(location.permalink, content, options);
  return {
    ...location,
    permalink,
    language: content.lang,
    redirects: location.redirects?.map((redirect) => ({
      ...redirect,
      path: localizePath(redirect.path, content, options),
    })),
    metadata: {
      ...location.metadata,
      [TRANSLATION_METADATA_KEY]: content.translationId,
    },
  };
}

function localizePath(
  pathname: string,
  content: DetectedContent,
  options: ReturnType<typeof resolveOptions>,
): string {
  const unlocalizedPath = removeLocalePathSegments(pathname, content);
  return content.lang === options.defaultLang
    ? unlocalizedPath
    : prefixLanguage(unlocalizedPath, content.lang);
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
  return result || "/";
}

function prefixLanguage(permalink: string, language: string): string {
  const suffix = permalink === "/" ? "" : permalink;
  return `/${language}${suffix}`;
}

function findTranslation(
  state: L10nState,
  translationId: string,
  lang: string,
): DetectedContent | null {
  const key = `${translationId}\u0000${lang}`;
  if (state.conflictedGroups.has(key)) return null;
  return state.contentsByTranslationAndLanguage.get(key) ?? null;
}

/**
 * Resolves a content target using the source locale, falling back to the
 * original target when no unambiguous translation exists.
 */
function resolveLocalizedTarget(
  state: L10nState,
  source: DetectedContent,
  targetSlug: string,
): DetectedContent | null {
  const target = state.contents.get(targetSlug);
  if (!target) return null;
  return findTranslation(state, target.translationId, source.lang) ?? target;
}

const PUBLICATION_KEYS = [
  "visibility",
  "publishAt",
  "publish",
  "private",
  "draft",
] as const;

function signalValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function publicationSignal(frontmatter: PostFrontmatter): string {
  return PUBLICATION_KEYS.map((key) => signalValue(frontmatter[key])).join(
    "\u0001",
  );
}

function groupMemberToken(state: L10nState, member: DetectedContent): string {
  return [
    member.lang,
    member.slug,
    state.locations?.get(member.slug)?.permalink ?? "",
    publicationSignal(member.frontmatter),
  ].join("\u0001");
}

function localizedResolutionToken(
  state: L10nState,
  source: DetectedContent,
  targetSlug: string,
): string {
  const target = resolveLocalizedTarget(state, source, targetSlug);
  if (!target) return "";
  return `${target.slug}\u0001${state.locations?.get(target.slug)?.permalink ?? ""}`;
}

function referencedPermalinks(
  markdown: string,
  slugsByPermalink: ReadonlyMap<string, string>,
): string[] {
  if (slugsByPermalink.size === 0) return [];
  const found = new Set<string>();
  for (const url of extractMarkdownLinkUrls(markdown)) {
    const { permalink } = splitLinkUrl(url);
    if (slugsByPermalink.has(permalink)) found.add(permalink);
  }
  return [...found].sort();
}

function computeLocalizationSignatures(
  state: L10nState,
  entries: readonly ContentLocationInput[],
  contentIndex: Map<string, string>,
): ReadonlyMap<string, string> {
  const markdownBySlug = new Map(
    entries.map((entry) => [entry.slug, entry.markdown]),
  );
  const membersByTranslation = new Map<string, string[]>();
  for (const member of state.contents.values()) {
    const members = membersByTranslation.get(member.translationId) ?? [];
    members.push(groupMemberToken(state, member));
    membersByTranslation.set(member.translationId, members);
  }
  for (const members of membersByTranslation.values()) members.sort();

  const collectParts = (
    content: DetectedContent,
    trail: ReadonlySet<string>,
  ): string[] => {
    const members = membersByTranslation.get(content.translationId) ?? [];
    const parts = [
      `own:${content.lang}\u0001${content.translationId}`,
      ...members.map((member) => `group:${member}`),
    ];
    const markdown = markdownBySlug.get(content.slug) ?? "";
    const links = extractContentLinks(markdown, contentIndex);
    for (const link of links) {
      if (link.kind === "image" || link.kind === "attachment") continue;
      parts.push(
        `wiki:${link.raw.toLowerCase()}=${
          link.slug ? localizedResolutionToken(state, content, link.slug) : ""
        }`,
      );
    }
    for (const permalink of referencedPermalinks(
      markdown,
      state.slugsByPermalink,
    )) {
      const targetSlug = state.slugsByPermalink.get(permalink);
      parts.push(
        `url:${permalink}=${
          targetSlug ? localizedResolutionToken(state, content, targetSlug) : ""
        }`,
      );
    }
    if (trail.size < 3) {
      for (const link of links) {
        if (!link.embed || !link.slug || trail.has(link.slug)) continue;
        const embedded = state.contents.get(link.slug);
        if (!embedded) continue;
        parts.push(
          ...collectParts(embedded, new Set([...trail, embedded.slug])),
        );
      }
    }
    return parts;
  };

  const signatures = new Map<string, string>();
  for (const content of state.contents.values()) {
    const parts = collectParts(content, new Set());
    parts.sort();
    signatures.set(content.slug, parts.join("\n"));
  }
  return signatures;
}

function addLocalizationHeadTags(
  manifest: ContentManifest,
  state: L10nState,
): void {
  const translationsById = collectDiscoverableTranslations(manifest);
  for (const entry of manifest.discoverableEntries) {
    const content = state.contents.get(entry.slug);
    if (!content) continue;
    const translations = translationsById.get(content.translationId) ?? [];
    const headTags = translations.map(
      (translation): PluginHeadTag => ({
        tag: "link",
        attrs: {
          rel: "alternate",
          hreflang: translation.publicLocation.language ?? "",
          href: translation.permalink,
        },
      }),
    );
    entry.headTags = [
      ...(entry.headTags ?? []).filter(
        (tag) => !headTags.some((generated) => sameHeadTag(tag, generated)),
      ),
      ...headTags,
    ];
  }
}

function collectDiscoverableTranslations(
  manifest: ContentManifest,
): ReadonlyMap<string, readonly ContentManifestEntry[]> {
  const candidatesById = new Map<string, ContentManifestEntry[]>();
  for (const entry of manifest.discoverableEntries) {
    const translationId =
      entry.publicLocation.metadata?.[TRANSLATION_METADATA_KEY];
    if (!translationId) continue;
    const candidates = candidatesById.get(translationId) ?? [];
    candidates.push(entry);
    candidatesById.set(translationId, candidates);
  }
  return new Map(
    [...candidatesById].map(([translationId, candidates]) => [
      translationId,
      uniqueLanguageEntries(candidates),
    ]),
  );
}

function _localizationForEntry(
  entry: ContentManifestEntry,
  translationId: string,
  translations: readonly ContentManifestEntry[],
): LocalizedContent | null {
  const lang = entry.publicLocation.language;
  if (!lang) return null;
  const translationMap = Object.fromEntries(
    translations.map((translation) => [
      translation.publicLocation.language ?? "",
      translation.permalink,
    ]),
  );
  return {
    slug: entry.slug,
    permalink: entry.permalink,
    lang,
    translationId,
    availableLanguages: Object.keys(translationMap).sort(),
    translations: translationMap,
  };
}

function sameHeadTag(left: PluginHeadTag, right: PluginHeadTag): boolean {
  return (
    left.tag === right.tag &&
    left.attrs?.rel === right.attrs?.rel &&
    left.attrs?.hreflang === right.attrs?.hreflang &&
    left.attrs?.href === right.attrs?.href
  );
}

function uniqueLanguageEntries<
  Entry extends ContentManifestEntry | PublicContentEntry,
>(entries: readonly Entry[]): readonly Entry[] {
  const entriesByLanguage = new Map<string, Entry[]>();
  for (const entry of entries) {
    const language = entry.publicLocation.language;
    if (!language) continue;
    const candidates = entriesByLanguage.get(language) ?? [];
    candidates.push(entry);
    entriesByLanguage.set(language, candidates);
  }
  return [...entriesByLanguage.values()]
    .filter((candidates) => candidates.length === 1)
    .flatMap((candidates) => (candidates[0] ? [candidates[0]] : []));
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
      )}); resolved to ${signals.frontmatter ?? signals.custom ?? signals.filename}.`,
    meta: {
      detected: signals,
      resolved: signals.frontmatter ?? signals.custom ?? signals.filename,
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
