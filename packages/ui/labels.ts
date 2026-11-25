export type UiLabelDictionary = Readonly<Record<string, string>>;
export type UiLabelDictionaries = Readonly<Record<string, UiLabelDictionary>>;

export type UiLabelsDefinition<
  D extends UiLabelDictionaries = UiLabelDictionaries,
> = {
  readonly namespace: string;
  readonly dictionaries: D;
};

type DefinitionWithEnglish = UiLabelsDefinition<
  { readonly en: UiLabelDictionary } & UiLabelDictionaries
>;

export type ResolvedUiLabels<T extends DefinitionWithEnglish> = {
  readonly [K in keyof T["dictionaries"]["en"]]: string;
};

export function defineUiLabels<
  const D extends { readonly en: UiLabelDictionary } & UiLabelDictionaries,
>(namespace: string, dictionaries: D): UiLabelsDefinition<D> {
  return { namespace, dictionaries };
}

export type ClientUiConfig = {
  readonly locale?: string;
  readonly labels?: Readonly<Record<string, UiLabelDictionaries>>;
};

declare global {
  var __riebeckiteUi: ClientUiConfig | undefined;
}

export function resolveClientUiLabels<
  D extends { readonly en: UiLabelDictionary } & UiLabelDictionaries,
>(
  definition: UiLabelsDefinition<D>,
  language?: string,
): ResolvedUiLabels<UiLabelsDefinition<D>> {
  const ui =
    typeof globalThis === "undefined" ? undefined : globalThis.__riebeckiteUi;
  const sourceLanguage =
    language ??
    (typeof document === "undefined"
      ? undefined
      : document.documentElement.lang);
  return resolveUiLabels(definition, ui?.locale ?? sourceLanguage, ui?.labels);
}

export function resolveUiLabels<
  D extends { readonly en: UiLabelDictionary } & UiLabelDictionaries,
>(
  definition: UiLabelsDefinition<D>,
  language: string | undefined,
  overrides?: Readonly<Record<string, UiLabelDictionaries>>,
): ResolvedUiLabels<UiLabelsDefinition<D>> {
  const labels: Record<string, string> = { ...definition.dictionaries.en };
  mergeDictionary(labels, definition.dictionaries, language);
  mergeDictionary(labels, overrides?.[definition.namespace], language);
  return labels as ResolvedUiLabels<UiLabelsDefinition<D>>;
}

function mergeDictionary(
  target: Record<string, string>,
  dictionaries: UiLabelDictionaries | undefined,
  language: string | undefined,
): void {
  if (dictionaries === undefined || language === undefined) return;
  const dictionary = findDictionary(dictionaries, language);
  if (dictionary === undefined) return;
  for (const [key, value] of Object.entries(dictionary)) {
    if (typeof value === "string" && value !== "") target[key] = value;
  }
}

function findDictionary(
  dictionaries: UiLabelDictionaries,
  language: string,
): UiLabelDictionary | undefined {
  const entries = Object.entries(dictionaries);
  const normalized = normalizeLocale(language);
  const exact = entries.find(
    ([locale]) => normalizeLocale(locale) === normalized,
  );
  if (exact) return exact[1];
  const primary = primarySubtag(normalized);
  return entries.find(([locale]) => primarySubtag(locale) === primary)?.[1];
}

function normalizeLocale(value: string): string {
  return value.trim().replace(/_/g, "-").toLowerCase();
}

function primarySubtag(value: string): string {
  return normalizeLocale(value).split("-")[0] ?? "";
}
