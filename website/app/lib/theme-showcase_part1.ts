import {
  resolveTheme,
  type ThemeInstance,
  type ThemePreset,
  type ThemeSettingsSchema,
} from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";
import { editorialTheme } from "@riebeckite/theme-editorial";
import { fieldnotesTheme } from "@riebeckite/theme-fieldnotes";
import { folioTheme } from "@riebeckite/theme-folio";
import { gardenTheme } from "@riebeckite/theme-garden";
import { gruvboxTheme } from "@riebeckite/theme-gruvbox";
import { minimalTheme } from "@riebeckite/theme-minimal";
import { moduleTheme } from "@riebeckite/theme-module";
import { rerurateTheme } from "@riebeckite/theme-rerurate";
import { sakuraTheme } from "@riebeckite/theme-sakura";
import { signalTheme } from "@riebeckite/theme-signal";
import { technicalTheme } from "@riebeckite/theme-technical";
import { terminalTheme } from "@riebeckite/theme-terminal";
import { tokyonightTheme } from "@riebeckite/theme-tokyonight";
import type { WebLocale } from "./locale";

export type ShowcaseTheme = {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly packageName: string;
  readonly factory: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly settings: ThemeSettingsSchema;
  readonly presets: Readonly<Record<string, ThemePreset<ThemeSettingsSchema>>>;
};

export function themeDefinition(
  theme: ThemeInstance,
  details: Omit<ShowcaseTheme, "name" | "attributes" | "settings" | "presets">,
): ShowcaseTheme {
  const resolved = resolveTheme(theme, defaultTheme);
  return {
    ...details,
    name: resolved.name,
    attributes: resolved.settings.attributes,
    settings: theme.definition.settings,
    presets: theme.definition.presets,
  };
}

export const showcaseThemes = [
  themeDefinition(defaultTheme(), {
    label: "Default",
    description: "A balanced foundation for documentation and product sites.",
    features: ["Balanced", "System-ready"],
    packageName: "@riebeckite/theme-default",
    factory: "defaultTheme",
  }),
  themeDefinition(minimalTheme({ settings: { flourish: true } }), {
    label: "Minimal",
    description: "A quiet baseline that keeps long-form content in focus.",
    features: ["Restrained", "Readable", "Flourish"],
    packageName: "@riebeckite/theme-minimal",
    factory: "minimalTheme",
  }),
  themeDefinition(moduleTheme({ settings: { flourish: true } }), {
    label: "Module",
    description:
      "Precision-built dark surfaces with a blueprint grid and warm edge light.",
    features: ["Blueprint grid", "Edge glow", "Flourish"],
    packageName: "@riebeckite/theme-module",
    factory: "moduleTheme",
  }),
  themeDefinition(signalTheme(), {
    label: "Signal",
    description:
      "Bold Swiss rules and graphic markers for high-signal reading.",
    features: ["Graphic hierarchy", "Swiss", "Density settings"],
    packageName: "@riebeckite/theme-signal",
    factory: "signalTheme",
  }),
  themeDefinition(gruvboxTheme(), {
    label: "Gruvbox",
    description: "Warm contrast for technical notes and focused writing.",
    features: ["Warm palette", "Contrast options"],
    packageName: "@riebeckite/theme-gruvbox",
    factory: "gruvboxTheme",
  }),
  themeDefinition(rerurateTheme(), {
    label: "Rerurate",
    description: "A characterful reading experience with editorial details.",
    features: ["Drop caps", "Motion options", "Cosmic motifs"],
    packageName: "@riebeckite/theme-rerurate",
    factory: "rerurateTheme",
  }),
  themeDefinition(sakuraTheme({ settings: { petals: true } }), {
    label: "Sakura",
    description: "A soft, expressive theme for personal writing.",
    features: ["Serif tone", "Decorated headings", "Petals"],
    packageName: "@riebeckite/theme-sakura",
    factory: "sakuraTheme",
  }),
  themeDefinition(tokyonightTheme(), {
    label: "Tokyo Night",
    description: "A nocturnal technical theme with precise contrast.",
    features: ["Technical", "Neon option"],
    packageName: "@riebeckite/theme-tokyonight",
    factory: "tokyonightTheme",
  }),
  themeDefinition(terminalTheme(), {
    label: "Terminal",
    description: "A restrained phosphor terminal for code and technical notes.",
    features: ["Monospace", "Phosphor options", "CRT controls"],
    packageName: "@riebeckite/theme-terminal",
    factory: "terminalTheme",
  }),
  themeDefinition(gardenTheme(), {
    label: "Garden",
    description: "Built for connected notes and a calm knowledge garden.",
    features: ["Notes", "Connected writing"],
    packageName: "@riebeckite/theme-garden",
    factory: "gardenTheme",
  }),
  themeDefinition(fieldnotesTheme(), {
    label: "Fieldnotes",
    description: "A research notebook with paper, margins, and archival marks.",
    features: ["Paper styles", "Notebook details", "Research-ready"],
    packageName: "@riebeckite/theme-fieldnotes",
    factory: "fieldnotesTheme",
  }),
  themeDefinition(editorialTheme(), {
    label: "Editorial",
    description: "A considered, publication-like layout for essays.",
    features: ["Long-form", "Typography-led"],
    packageName: "@riebeckite/theme-editorial",
    factory: "editorialTheme",
  }),
  themeDefinition(technicalTheme(), {
    label: "Technical",
    description: "Clear hierarchy and dense detail for reference material.",
    features: ["Documentation", "Code-first"],
    packageName: "@riebeckite/theme-technical",
    factory: "technicalTheme",
  }),
  themeDefinition(folioTheme(), {
    label: "Folio",
    description: "A visual portfolio surface for projects and case studies.",
    features: ["Portfolio", "Captions"],
    packageName: "@riebeckite/theme-folio",
    factory: "folioTheme",
  }),
] as const;

export const japaneseThemeDetails = [
  [
    "ドキュメントやプロダクトサイトのための、バランスのよい基本テーマ。",
    ["バランス重視", "システム設定対応"],
  ],
  [
    "長い文章を読みやすく見せる、静かなベースライン。",
    ["控えめ", "読みやすい"],
  ],
  [
    "設計グリッドと暖色のエッジライトを備えた、精密なダークテーマ。",
    ["設計グリッド", "エッジ発光"],
  ],
  [
    "太いルールとグラフィックマーカーで、情報の輪郭を際立たせるスイススタイルのテーマ。",
    ["グラフィック階層", "スイススタイル", "密度設定"],
  ],
  [
    "技術メモや集中して書く文章に合う、温かみのあるコントラスト。",
    ["暖色パレット", "コントラスト設定"],
  ],
  [
    "エディトリアルな細部を備えた、個性ある読書体験。",
    ["ドロップキャップ", "モーション設定", "宇宙モチーフ"],
  ],
  [
    "個人的な文章のための、やわらかく表情豊かなテーマ。",
    ["セリフ体", "装飾見出し"],
  ],
  [
    "精密なコントラストを備えた、夜向けの技術テーマ。",
    ["技術向け", "ネオン設定"],
  ],
  [
    "コードや技術ノート向けの、抑制された蛍光表示のターミナルテーマ。",
    ["等幅フォント", "蛍光色設定", "CRT設定"],
  ],
  [
    "つながりのあるノートと、落ち着いたナレッジガーデンのためのテーマ。",
    ["ノート", "リンクされた文章"],
  ],
  [
    "紙面、マージン、記録マークを備えたリサーチノート風のテーマ。",
    ["用紙スタイル", "ノートの細部", "リサーチ向け"],
  ],
  [
    "エッセイのための、よく考えられた出版物のようなレイアウト。",
    ["長文", "タイポグラフィ重視"],
  ],
  [
    "リファレンス資料のための、明快な階層と密度の高い情報設計。",
    ["ドキュメント", "コード重視"],
  ],
  [
    "プロジェクトとケーススタディのための、視覚的なポートフォリオテーマ。",
    ["ポートフォリオ", "キャプション"],
  ],
] as const;

export function getShowcaseThemes(locale: WebLocale): readonly ShowcaseTheme[] {
  if (locale !== "ja") return showcaseThemes;
  return showcaseThemes.map((theme, index) => ({
    ...theme,
    description: japaneseThemeDetails[index][0],
    features: japaneseThemeDetails[index][1],
  }));
}

export function getThemeDocsHref(name: string, locale: WebLocale): string {
  const theme = name === "riebeckite" ? "default" : name;
  const prefix = locale === "ja" ? "/ja" : "";
  return `${prefix}/docs/themes/${theme}`;
}

export function getThemeIdForDocsSlug(slug: string): string | undefined {
  const name = slug.replace(/^ja\//, "").replace(/^docs\/themes\//, "");
  const themeId = name === "default" ? "riebeckite" : name;
  return showcaseThemes.some((theme) => theme.name === themeId)
    ? themeId
    : undefined;
}
