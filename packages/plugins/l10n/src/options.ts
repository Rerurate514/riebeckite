import type { L10nOptions, ResolvedL10nOptions } from "./types.js";

export function resolveOptions(options: L10nOptions): ResolvedL10nOptions {
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

export function validateOptions(options: L10nOptions): string[] {
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

export function canonicalLanguage(value: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("A l10n language tag must be a non-empty string.");
  }
  try {
    return Intl.getCanonicalLocales(value.trim())[0] ?? value.trim();
  } catch {
    throw new Error(`Invalid l10n language tag: ${value}`);
  }
}
