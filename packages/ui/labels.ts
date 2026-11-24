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
  const dictionary = Object.entries(dictionaries).find(
    ([locale]) => locale.toLowerCase() === language.toLowerCase(),
  )?.[1];
  if (dictionary === undefined) return;
  for (const [key, value] of Object.entries(dictionary)) {
    if (typeof value === "string" && value !== "") target[key] = value;
  }
}
