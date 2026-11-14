import {
  bundledLanguages,
  getSingletonHighlighter,
  type Highlighter,
} from "shiki";

export const DEFAULT_THEME = {
  light: "github-light",
  dark: "github-dark",
};

export const lazyEmbeddedLanguageCache = new Map<string, readonly string[]>();

export const languageLoads = new WeakMap<
  Highlighter,
  Map<string, Promise<void>>
>();

export async function lazyEmbeddedLanguages(
  language: string,
): Promise<readonly string[]> {
  const cached = lazyEmbeddedLanguageCache.get(language);
  if (cached) return cached;
  const load = (
    bundledLanguages as Record<
      string,
      (() => Promise<{ default: unknown }>) | undefined
    >
  )[language];
  if (!load) return [];

  let registrations: unknown;
  try {
    registrations = (await load()).default;
  } catch {
    return [];
  }

  const list = Array.isArray(registrations) ? registrations : [registrations];
  const languages = new Set<string>();
  for (const registration of list) {
    const lazy = (registration as { embeddedLangsLazy?: readonly string[] })
      .embeddedLangsLazy;
    for (const embedded of lazy ?? []) languages.add(embedded);
  }

  const result = [...languages];
  lazyEmbeddedLanguageCache.set(language, result);
  return result;
}

export async function collectLanguages(
  language: string,
  languages: Set<string>,
  visiting: Set<string>,
): Promise<void> {
  if (languages.has(language) || visiting.has(language)) return;
  visiting.add(language);
  languages.add(language);
  for (const embedded of await lazyEmbeddedLanguages(language)) {
    await collectLanguages(embedded, languages, visiting);
  }
}

export async function loadLanguageWithEmbeddedLanguages(
  highlighter: Highlighter,
  language: string,
  loads: Map<string, Promise<void>>,
): Promise<void> {
  const existing = loads.get(language);
  if (existing) return await existing;

  const load = (async () => {
    const languages = new Set<string>();
    await collectLanguages(language, languages, new Set());
    for (const current of languages) {
      await highlighter
        .loadLanguage(current as Parameters<Highlighter["loadLanguage"]>[0])
        .catch(() => undefined);
    }
  })();
  loads.set(language, load);
  return await load;
}

export async function getDeterministicHighlighter(
  options: Parameters<typeof getSingletonHighlighter>[0],
): Promise<Highlighter> {
  const highlighter = await getSingletonHighlighter(options);
  let loads = languageLoads.get(highlighter);
  if (!loads) {
    loads = new Map();
    languageLoads.set(highlighter, loads);
  }

  return new Proxy(highlighter, {
    get(target, property) {
      if (property === "loadLanguage") {
        return async (language: string) => {
          await loadLanguageWithEmbeddedLanguages(target, language, loads);
        };
      }
      return Reflect.get(target, property, target);
    },
  });
}
