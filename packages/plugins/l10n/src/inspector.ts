import type { PluginInspectorTab } from "@riebeckite/core";
import type { L10nState, ResolvedL10nOptions } from "./types.js";

export function l10nInspectorTabs(
  getState: () => L10nState,
  options: ResolvedL10nOptions,
): PluginInspectorTab[] {
  return [
    {
      id: "l10n",
      title: { en: "Localization", ja: "ローカライズ" },
      description: {
        en: "Configured languages, translation coverage, and conflicts.",
        ja: "設定言語、翻訳カバレッジ、競合を表示します。",
      },
      order: 20,
      collect: () => {
        const state = getState();
        const groups = translationGroups(state);
        const counts = new Map(
          options.languages.map((language) => [language, 0]),
        );
        for (const content of state.contents.values()) {
          counts.set(content.lang, (counts.get(content.lang) ?? 0) + 1);
        }
        const missing = [...groups.values()].reduce(
          (total, group) =>
            total + options.languages.filter((lang) => !group.has(lang)).length,
          0,
        );
        return {
          kind: "key-value",
          items: [
            {
              key: { en: "Default language", ja: "既定言語" },
              value: options.defaultLang,
            },
            {
              key: { en: "Languages", ja: "言語" },
              value: options.languages.join(", "),
            },
            {
              key: { en: "Entries", ja: "エントリ" },
              value: state.contents.size,
            },
            {
              key: { en: "Translation groups", ja: "翻訳グループ" },
              value: groups.size,
            },
            {
              key: { en: "Missing translations", ja: "未翻訳" },
              value: missing,
            },
            {
              key: { en: "Conflicts", ja: "競合" },
              value: state.conflictedGroups.size,
            },
            ...options.languages.map((language) => ({
              key: language,
              value: counts.get(language) ?? 0,
            })),
          ],
        };
      },
    },
    {
      id: "l10n-translations",
      title: { en: "Translations", ja: "翻訳" },
      description: {
        en: "Coverage for each translation group.",
        ja: "翻訳グループごとのカバレッジを表示します。",
      },
      order: 21,
      collect: () => {
        const state = getState();
        const groups = translationGroups(state);
        const conflictGroups = new Set(
          [...state.conflictedGroups].map((key) => key.split("\u0000")[0]),
        );
        const ids = [...groups.keys()].sort((left, right) =>
          left.localeCompare(right),
        );
        const rows = ids.slice(0, 200).map((id) => {
          const group = groups.get(id) ?? new Set<string>();
          return [
            id,
            options.languages.filter((lang) => group.has(lang)).join(", "),
            options.languages.filter((lang) => !group.has(lang)).join(", "),
            conflictGroups.has(id) ? "yes" : "no",
          ];
        });
        if (ids.length > rows.length) {
          rows.push(["…", `${ids.length - rows.length} more`, "", ""]);
        }
        return {
          kind: "table",
          columns: [
            { en: "Translation", ja: "翻訳" },
            { en: "Languages", ja: "言語" },
            { en: "Missing", ja: "未翻訳" },
            { en: "Conflict", ja: "競合" },
          ],
          rows,
        };
      },
    },
  ];
}

function translationGroups(state: L10nState): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  for (const content of state.contents.values()) {
    const group = groups.get(content.translationId) ?? new Set<string>();
    group.add(content.lang);
    groups.set(content.translationId, group);
  }
  return groups;
}
