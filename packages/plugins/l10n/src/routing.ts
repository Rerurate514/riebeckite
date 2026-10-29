import { type ContentPublicLocation, escapeRegExp } from "@riebeckite/core";
import type {
  DetectedContent,
  L10nState,
  LocalizedLinkOptions,
  MarkdownNode,
  ResolvedL10nOptions,
} from "./types.js";
import { TRANSLATION_METADATA_KEY } from "./types.js";

export function withLocalization(
  location: ContentPublicLocation,
  content: DetectedContent,
  options: ResolvedL10nOptions,
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

export function remarkLocalizedLinks(options: LocalizedLinkOptions) {
  return (tree: MarkdownNode) => {
    const source = options.sourceSlug
      ? options.state.contents.get(options.sourceSlug)
      : undefined;
    if (!source || !options.state.locations) return;
    localizeLinks(tree, source, options, options.state.slugsByPermalink);
  };
}

export function resolveLocalizedTarget(
  state: L10nState,
  source: DetectedContent,
  targetSlug: string,
): DetectedContent | null {
  const target = state.contents.get(targetSlug);
  if (!target) return null;
  return findTranslation(state, target.translationId, source.lang) ?? target;
}

export function splitLinkUrl(url: string): {
  permalink: string;
  suffix: string;
} {
  const suffixIndex = url.search(/[?#]/);
  return suffixIndex < 0
    ? { permalink: url, suffix: "" }
    : { permalink: url.slice(0, suffixIndex), suffix: url.slice(suffixIndex) };
}

function localizePath(
  pathname: string,
  content: DetectedContent,
  options: ResolvedL10nOptions,
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

function findTranslation(
  state: L10nState,
  translationId: string,
  lang: string,
): DetectedContent | null {
  const key = `${translationId}\u0000${lang}`;
  if (state.conflictedGroups.has(key)) return null;
  return state.contentsByTranslationAndLanguage.get(key) ?? null;
}
