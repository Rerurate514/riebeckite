import type { UiLabelContext, UiLabelOverrides } from "@riebeckite/core";

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

export type UiLabelResolution<T extends DefinitionWithEnglish> = {
  readonly labels: ResolvedUiLabels<T>;
  readonly language?: string;
  readonly builtInLocale?: string;
  readonly overrideLocale?: string;
  readonly sources: Readonly<Record<string, "en" | "built-in" | "override">>;
};

const definitions = new Map<string, DefinitionWithEnglish>();

export function defineUiLabels<
  const D extends { readonly en: UiLabelDictionary } & UiLabelDictionaries,
>(namespace: string, dictionaries: D): UiLabelsDefinition<D> {
  const definition = { namespace, dictionaries };
  definitions.set(namespace, definition);
  return definition;
}

export function getUiLabelDefinitions(): readonly DefinitionWithEnglish[] {
  return [...definitions.values()];
}

export type ClientUiConfig = {
  readonly locale?: string;
  readonly labels?: UiLabelOverrides;
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
  return resolveUiLabels(definition, {
    language: ui?.locale ?? sourceLanguage,
    overrides: ui?.labels,
  });
}

export function resolveUiLabels<
  D extends { readonly en: UiLabelDictionary } & UiLabelDictionaries,
>(
  definition: UiLabelsDefinition<D>,
  context: UiLabelContext = {},
): ResolvedUiLabels<UiLabelsDefinition<D>> {
  return resolveUiLabelsWithTrace(definition, context).labels;
}

export function resolveUiLabelsWithTrace<
  D extends { readonly en: UiLabelDictionary } & UiLabelDictionaries,
>(
  definition: UiLabelsDefinition<D>,
  context: UiLabelContext = {},
): UiLabelResolution<UiLabelsDefinition<D>> {
  const labels: Record<string, string> = { ...definition.dictionaries.en };
  const sources: Record<string, "en" | "built-in" | "override"> =
    Object.fromEntries(Object.keys(labels).map((key) => [key, "en"]));
  const builtIn = mergeDictionary(
    labels,
    sources,
    definition.dictionaries,
    context.language,
    "built-in",
  );
  const override = mergeDictionary(
    labels,
    sources,
    context.overrides?.[definition.namespace],
    context.language,
    "override",
  );
  return {
    labels: labels as ResolvedUiLabels<UiLabelsDefinition<D>>,
    ...(context.language ? { language: context.language } : {}),
    ...(builtIn ? { builtInLocale: builtIn } : {}),
    ...(override ? { overrideLocale: override } : {}),
    sources,
  };
}

function mergeDictionary(
  target: Record<string, string>,
  sources: Record<string, "en" | "built-in" | "override">,
  dictionaries: UiLabelDictionaries | undefined,
  language: string | undefined,
  source: "built-in" | "override",
): string | undefined {
  if (dictionaries === undefined || language === undefined) return undefined;
  const entry = findDictionary(dictionaries, language);
  if (entry === undefined) return undefined;
  const [locale, dictionary] = entry;
  for (const [key, value] of Object.entries(dictionary)) {
    if (typeof value === "string" && value !== "") {
      target[key] = value;
      sources[key] = source;
    }
  }
  return locale;
}

function findDictionary(
  dictionaries: UiLabelDictionaries,
  language: string,
): [string, UiLabelDictionary] | undefined {
  const entries = Object.entries(dictionaries);
  const normalized = normalizeLocale(language);
  const exact = entries.find(
    ([locale]) => normalizeLocale(locale) === normalized,
  );
  if (exact) return exact;
  const primary = primarySubtag(normalized);
  return entries.find(([locale]) => primarySubtag(locale) === primary);
}

function normalizeLocale(value: string): string {
  return value.trim().replace(/_/g, "-").toLowerCase();
}

function primarySubtag(value: string): string {
  return normalizeLocale(value).split("-")[0] ?? "";
}
