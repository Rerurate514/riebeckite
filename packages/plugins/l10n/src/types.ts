import type {
  ContentLocationInput,
  ContentPublicLocation,
  Diagnostic,
  PostFrontmatter,
} from "@riebeckite/core";

export const TRANSLATION_METADATA_KEY = "l10n.translationId";

export type L10nContent = {
  readonly path: string;
  readonly slug: string;
  readonly frontmatter: PostFrontmatter;
};

export type L10nDetectorContext = L10nContent & {
  readonly filenameLanguage: string | undefined;
};

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

export type DetectedContent = L10nContent & {
  readonly lang: string;
  readonly translationId: string;
  readonly signals: Readonly<Record<string, string>>;
};

export type L10nState = {
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

export type ResolvedL10nOptions = {
  readonly defaultLang: string;
  readonly languages: readonly string[];
  readonly languageByLowercase: ReadonlyMap<string, string>;
  readonly strict: boolean;
  readonly translationKey: string;
  readonly detect: L10nOptions["detect"];
};

export type MarkdownNode = {
  readonly type?: string;
  url?: string;
  readonly children?: MarkdownNode[];
};

export type LocalizedLinkOptions = {
  readonly state: L10nState;
  readonly sourceSlug: string | undefined;
  readonly resolvePermalink: (slug: string) => string;
};

export type ContentLocations = {
  readonly entries: readonly ContentLocationInput[];
  readonly locations: Map<string, ContentPublicLocation>;
  readonly contentIndex: Map<string, string>;
};
