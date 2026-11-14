import {
  examplesContent,
  referencePluginsContent,
  referenceThemesContent,
} from "./content_pages_extra.js";
import { pluginsContent } from "./content_pages_plugins.js";
import { themesContent } from "./content_pages_themes.js";
import {
  defaultLanguageForLocale,
  SCAFFOLD_LANGUAGES,
  type ScaffoldLanguage,
  type ScaffoldPreset,
} from "./presets.js";
import type {
  SiteTemplateFile,
  SiteTemplateVariables,
} from "./template_types.js";

export { PLUGIN_MARKDOWN_GUIDES } from "./content_pages_guides.js";

/**
 * Generates the catalog-derived content pages for a scaffold preset.
 *
 * Authored pages (`index`, `guide`) and static fixtures/assets are real files
 * under `templates/scaffold/presets/<preset>/content` and are copied by
 * `presetContentFiles`. This function only builds pages assembled from catalog
 * data: `framework/plugins`, `framework/themes`, `examples`, and `reference/*`.
 *
 * Localized pages follow the l10n plugin convention: the default-language page
 * keeps the plain name (`framework/plugins.md`) while every other language uses
 * the `<base>.<lang>.md` suffix. Reference pages are English-only and are
 * suffixed with `.en` when English is not the site's default language.
 */
export function contentPageFiles(
  variables: SiteTemplateVariables,
  preset: ScaffoldPreset,
): readonly SiteTemplateFile[] {
  const defaultLang = defaultLanguageForLocale(variables.locale);
  const files: SiteTemplateFile[] = [];
  const localized = preset.languages.length > 1;

  const pushLocalized = (
    basePath: string,
    build: (language: ScaffoldLanguage) => string,
  ): void => {
    if (!localized) {
      files.push({
        path: `content/${basePath}.md`,
        content: build(defaultLang as ScaffoldLanguage),
      });
      return;
    }
    for (const language of SCAFFOLD_LANGUAGES) {
      const suffix = language === defaultLang ? "" : `.${language}`;
      files.push({
        path: `content/${basePath}${suffix}.md`,
        content: build(language),
      });
    }
  };

  const pushEnglishOnly = (basePath: string, build: () => string): void => {
    const suffix = defaultLang === "en" ? "" : ".en";
    files.push({
      path: `content/${basePath}${suffix}.md`,
      content: build(),
    });
  };

  for (const page of preset.contentPages) {
    if (page === "framework/plugins") {
      pushLocalized("framework/plugins", (language) =>
        pluginsContent(language),
      );
    } else if (page === "framework/themes") {
      pushLocalized("framework/themes", (language) =>
        themesContent(language, preset),
      );
    } else if (page === "examples") {
      pushLocalized("examples", (language) =>
        examplesContent(preset, language),
      );
    } else if (page === "reference/plugins") {
      pushEnglishOnly("reference/plugins", () =>
        referencePluginsContent(preset, variables),
      );
    } else if (page === "reference/themes") {
      pushEnglishOnly("reference/themes", () => referenceThemesContent(preset));
    }
  }

  return files;
}
