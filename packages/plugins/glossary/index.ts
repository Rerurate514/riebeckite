import {
  type ConfigValidationIssue,
  type ContentManifest,
  createStyleAsset,
  definePlugin,
  localizedPagePath,
  selectLocalizedEntries,
} from "@riebeckite/core";
import {
  buildGlossary,
  renderGlossaryPage,
  resolveGlossaryOptions,
} from "./src/glossary.js";
import type { GlossaryOptions } from "./src/types.js";

export {
  buildGlossary,
  DEFAULT_GLOSSARY_BASE_PATH,
  DEFAULT_GLOSSARY_CLASS_NAME,
  DEFAULT_GLOSSARY_KEY,
  renderGlossaryPage,
  resolveGlossaryOptions,
} from "./src/glossary.js";
export type {
  GlossaryEntry,
  GlossaryOptions,
  ResolvedGlossaryOptions,
} from "./src/types.js";

export const GLOSSARY_PLUGIN_NAME = "glossary";

export function glossary(options: GlossaryOptions = {}) {
  const resolved = resolveGlossaryOptions(options);
  return definePlugin({
    name: GLOSSARY_PLUGIN_NAME,
    options,
    assets: [
      createStyleAsset("glossary", "@riebeckite/plugin-glossary/style.css"),
    ],
    validateOptions: validateGlossaryOptions,
    pageTypes: [
      {
        id: "glossary",
        paths: ({ manifest }) =>
          glossaryPages(manifest, resolved).map((page) => page.pathname),
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          const model = glossaryPages(manifest, resolved).find(
            (page) => page.pathname === pathname,
          );
          if (!model) return null;
          const page = renderGlossaryPage(model.entries, resolved);
          return {
            type: "glossary",
            pathname,
            title: page.title,
            body: page.html,
            ...(model.locale ? { language: model.locale } : {}),
          };
        },
        resolveRoute: ({ manifest, pathname }) => {
          const model = glossaryPages(manifest, resolved).find(
            (page) => page.pathname === pathname,
          );
          if (!model) return null;
          const page = renderGlossaryPage(model.entries, resolved);
          return {
            type: "glossary",
            pathname,
            title: page.title,
            body: page.html,
            ...(model.locale ? { language: model.locale } : {}),
          };
        },
      },
    ],
  });
}

function glossaryPages(
  manifest: ContentManifest,
  options: ReturnType<typeof resolveGlossaryOptions>,
): {
  pathname: string;
  locale?: string;
  entries: ReturnType<typeof buildGlossary>;
}[] {
  if (options.basePath === "") return [];
  const localization = manifest.localization;
  if (!localization) {
    const entries = buildGlossary(manifest.discoverableEntries, options);
    return entries.length === 0
      ? []
      : [{ pathname: options.basePath, entries }];
  }
  const locales =
    options.localeMode === "all"
      ? [localization.defaultLocale]
      : localization.locales;
  return locales.flatMap((locale) => {
    const entries = buildGlossary(
      selectLocalizedEntries(manifest.discoverableEntries, {
        mode: options.localeMode,
        locale,
        ...(localization.fallbackLocale
          ? { fallbackLocale: localization.fallbackLocale }
          : {}),
      }),
      options,
    );
    return entries.length === 0
      ? []
      : [
          {
            pathname: localizedPagePath(localization, options.basePath, locale),
            locale,
            entries,
          },
        ];
  });
}

function validateGlossaryOptions(
  options: GlossaryOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];
  for (const key of [
    "basePath",
    "className",
    "key",
    "termKey",
    "definitionKey",
    "title",
  ] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  if (
    options.localeMode !== undefined &&
    options.localeMode !== "current" &&
    options.localeMode !== "fallback" &&
    options.localeMode !== "all"
  ) {
    issues.push({
      path: "localeMode",
      message: 'Expected "current", "fallback", or "all".',
    });
  }
  return issues;
}
