import { defineEndpoint, type PluginEndpoint } from "@riebeckite/core";
import { serializeTaxonomyIndex } from "./src/collections.js";
import type { ResolvedTaxonomyOptions, TaxonomyIndex } from "./src/types.js";
import { taxonomyModels } from "./taxonomy_model.js";

export function createTaxonomyEndpoints(
  resolved: ResolvedTaxonomyOptions,
): PluginEndpoint[] {
  if (!resolved.tags && !resolved.folders) return [];
  return [
    defineEndpoint(
      resolved.dataEndpoint,
      ({ manifest, config, request }) => {
        const models = taxonomyModels(manifest, resolved, config);
        const model = selectTaxonomyModel(models, request);
        return model
          ? {
              json: serializeTaxonomyIndex(model.index),
              headers: { Vary: "Accept-Language" },
            }
          : {
              json: { tags: [], folders: [] },
              headers: { Vary: "Accept-Language" },
            };
      },
      { cacheControl: "public, max-age=300" },
    ),
  ];
}

export function selectTaxonomyModel(
  models: readonly { locale: string; index: TaxonomyIndex }[],
  request: {
    query: Readonly<Record<string, string>>;
    headers: Readonly<Record<string, string>>;
  },
): { locale: string; index: TaxonomyIndex } | undefined {
  const requested = request.query.locale;
  if (requested) {
    const exact = findLocaleModel(models, requested);
    if (exact) return exact;
  }
  for (const language of parseAcceptLanguage(
    request.headers["accept-language"],
  )) {
    const match = findLocaleModel(models, language);
    if (match) return match;
  }
  return models[0];
}

export function findLocaleModel(
  models: readonly { locale: string; index: TaxonomyIndex }[],
  language: string,
): { locale: string; index: TaxonomyIndex } | undefined {
  const value = language.toLowerCase().replace(/_/g, "-");
  return (
    models.find((candidate) => candidate.locale.toLowerCase() === value) ??
    models.find((candidate) => {
      const locale = candidate.locale.toLowerCase();
      return locale.startsWith(`${value}-`) || value.startsWith(`${locale}-`);
    })
  );
}

export function parseAcceptLanguage(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .flatMap((part) => {
      const [locale, ...parameters] = part.trim().split(";");
      if (!locale) return [];
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      const weight = quality ? Number(quality.slice(2)) : 1;
      return [
        { locale: locale.trim(), weight: Number.isFinite(weight) ? weight : 0 },
      ];
    })
    .filter((entry) => entry.locale !== "" && entry.weight > 0)
    .sort((left, right) => right.weight - left.weight)
    .map((entry) => entry.locale);
}
