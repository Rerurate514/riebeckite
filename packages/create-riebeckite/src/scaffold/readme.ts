import { defaultLanguageForLocale } from "./presets_languages.js";
import type { ScaffoldPreset } from "./presets_types.js";
import { readmeEn } from "./readme_en.js";
import { readmeJa } from "./readme_ja.js";
import type { SiteTemplateVariables } from "./template_types.js";

export function readme(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  const ja = defaultLanguageForLocale(variables.locale) === "ja";
  return ja ? readmeJa(preset, variables) : readmeEn(preset, variables);
}
