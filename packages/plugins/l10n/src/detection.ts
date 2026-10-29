import {
  attachErrorPath,
  type ContentLocationInput,
  type Diagnostic,
  type PostFrontmatter,
} from "@riebeckite/core";
import { parse } from "yaml";
import { canonicalLanguage } from "./options.js";
import type {
  DetectedContent,
  L10nDetectorContext,
  L10nState,
  ResolvedL10nOptions,
} from "./types.js";

export function detectContents(
  entries: readonly ContentLocationInput[],
  options: ResolvedL10nOptions,
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

export function throwForStrictDiagnostics(
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
  options: ResolvedL10nOptions,
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
