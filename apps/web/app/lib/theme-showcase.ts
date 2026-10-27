import {
  resolveTheme,
  type ThemeInstance,
  type ThemePreset,
  type ThemeSettingsSchema,
} from "@riebeckite/core";
import type { PreviewFixture } from "@riebeckite/preview";
import { defaultTheme } from "@riebeckite/theme-default";
import { editorialTheme } from "@riebeckite/theme-editorial";
import { folioTheme } from "@riebeckite/theme-folio";
import { gardenTheme } from "@riebeckite/theme-garden";
import { gruvboxTheme } from "@riebeckite/theme-gruvbox";
import { minimalTheme } from "@riebeckite/theme-minimal";
import { moduleTheme } from "@riebeckite/theme-module";
import { rerurateTheme } from "@riebeckite/theme-rerurate";
import { sakuraTheme } from "@riebeckite/theme-sakura";
import { technicalTheme } from "@riebeckite/theme-technical";
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

function themeDefinition(
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
  themeDefinition(gardenTheme(), {
    label: "Garden",
    description: "Built for connected notes and a calm knowledge garden.",
    features: ["Notes", "Connected writing"],
    packageName: "@riebeckite/theme-garden",
    factory: "gardenTheme",
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

const japaneseThemeDetails = [
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
    "つながりのあるノートと、落ち着いたナレッジガーデンのためのテーマ。",
    ["ノート", "リンクされた文章"],
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

export const showcaseFixtures: readonly PreviewFixture[] = [
  {
    id: "article",
    title: "Article",
    markdown: `# A considered interface\n\nA theme is more than a palette. It sets the rhythm of **reading**, the weight of a heading, and the space between ideas. Visit [Riebeckite](https://riebeckite.dev).\n\n## Reading with structure\n\n> Good typography makes a complex page easier to enter.\n\n- A clear hierarchy\n- Comfortable line length\n- Details that stay out of the way\n\n1. Write in Markdown\n2. Render with Riebeckite\n3. Choose the right theme\n\n### A small example\n\n\`\`\`ts\nimport { defineConfig } from "@riebeckite/core";\n\nexport default defineConfig({\n  theme: gardenTheme(),\n});\n\`\`\`\n\n| Token | Purpose |\n| --- | --- |\n| ink | Primary text |\n| paper | Surface |\n| accent | Links and focus |\n\n> [!NOTE]\n> The same Markdown makes typography and spacing differences easy to compare.\n\n---`,
  },
  {
    id: "notes",
    title: "Notes",
    markdown: `---\ntags: [design, notes]\nstatus: growing\n---\n\n# Theme observations\n\n[[Reading list]] collects references; [[Design principles]] holds the decisions behind this page.\n\n## Backlinks\n\n- [[Project index]] links here from the current release note.\n- A short note can still carry useful properties.\n\n> [!TIP]\n> Select **Reading list** from the page menu to inspect a related page.`,
    currentPageId: "observations",
    pages: [
      {
        id: "observations",
        title: "Theme observations",
        path: "notes/Theme observations.md",
        markdown: `# Theme observations\n\n[[Reading list]] collects references; [[Design principles]] holds the decisions behind this page.\n\n> [!NOTE]\n> Notes stay small, linked, and easy to revisit.`,
      },
      {
        id: "reading-list",
        title: "Reading list",
        path: "notes/Reading list.md",
        markdown: `# Reading list\n\n- [[Theme observations]]\n- *The Elements of Typographic Style*\n- A useful design decision record`,
      },
    ],
  },
  {
    id: "documentation",
    title: "Documentation",
    markdown: `# Configure a theme\n\nUse a theme factory in \`riebeckite.config.ts\`.\n\n## Installation\n\n\`\`\`sh\nnpm install @riebeckite/theme-garden\n\`\`\`\n\n## Configuration\n\n\`\`\`ts\nimport { defineConfig } from "@riebeckite/core";\nimport { gardenTheme } from "@riebeckite/theme-garden";\n\nexport default defineConfig({ theme: gardenTheme() });\n\`\`\`\n\n| Mode | Behaviour |\n| --- | --- |\n| light | Always light |\n| dark | Always dark |\n| system | Follows the OS |\n\n> [!WARNING]\n> Install the package before importing its factory.`,
  },
  {
    id: "portfolio",
    title: "Portfolio",
    markdown: `# Atlas field notes\n\n![A quiet desk with an open notebook](https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80)\n\n*Research, writing, and an interface for returning to ideas.*\n\n## The work\n\nAtlas turns scattered project notes into a readable public record. The system pairs concise essays with a searchable archive.\n\n[Read the case study](https://riebeckite.dev)\n\n> [!NOTE]\n> External images are intentionally limited to HTTPS in the preview document.`,
  },
] as const;

const japaneseFixtureContent = [
  {
    title: "記事",
    markdown: `# 考え抜かれたインターフェース\n\nテーマは単なる配色ではありません。**読むこと**のリズム、見出しの重み、アイデアの間にある余白を形づくります。 [Riebeckite](https://riebeckite.dev) を見てみましょう。\n\n## 構造を持って読む\n\n> よいタイポグラフィは、複雑なページにも入りやすくしてくれます。\n\n- 明確な階層\n- 心地よい行の長さ\n- 邪魔をしない細部\n\n1. Markdown で書く\n2. Riebeckite でレンダリングする\n3. 適切なテーマを選ぶ\n\n### 小さな例\n\n\`\`\`ts\nimport { defineConfig } from "@riebeckite/core";\n\nexport default defineConfig({\n  theme: gardenTheme(),\n});\n\`\`\`\n\n| トークン | 用途 |\n| --- | --- |\n| ink | 基本文字色 |\n| paper | 背景面 |\n| accent | リンクとフォーカス |\n\n> [!NOTE]\n> 同じ Markdown を使うと、タイポグラフィや余白の違いを比べやすくなります。\n\n---`,
  },
  {
    title: "ノート",
    markdown: `---\ntags: [デザイン, ノート]\nstatus: 作成中\n---\n\n# テーマについての観察\n\n[[読書リスト]] には参考資料を、[[デザイン原則]] にはこのページの判断をまとめています。\n\n## バックリンク\n\n- [[プロジェクト一覧]] から現在のリリースノートにリンクされています。\n- 短いノートにも役立つ情報を残せます。\n\n> [!TIP]\n> ページメニューから **読書リスト** を選ぶと、関連ページを確認できます。`,
    pages: [
      {
        id: "observations",
        title: "テーマについての観察",
        path: "notes/テーマについての観察.md",
        markdown: `# テーマについての観察\n\n[[読書リスト]] には参考資料を、[[デザイン原則]] にはこのページの判断をまとめています。\n\n> [!NOTE]\n> ノートは小さく、つながりを持たせ、何度でも見返せるようにしておきます。`,
      },
      {
        id: "reading-list",
        title: "読書リスト",
        path: "notes/読書リスト.md",
        markdown: `# 読書リスト\n\n- [[テーマについての観察]]\n- *The Elements of Typographic Style*\n- 役立つ設計判断の記録`,
      },
    ],
  },
  {
    title: "ドキュメント",
    markdown: `# テーマを設定する\n\n\`riebeckite.config.ts\` でテーマファクトリーを使います。\n\n## インストール\n\n\`\`\`sh\nnpm install @riebeckite/theme-garden\n\`\`\`\n\n## 設定\n\n\`\`\`ts\nimport { defineConfig } from "@riebeckite/core";\nimport { gardenTheme } from "@riebeckite/theme-garden";\n\nexport default defineConfig({ theme: gardenTheme() });\n\`\`\`\n\n| モード | 動作 |\n| --- | --- |\n| light | 常にライト |\n| dark | 常にダーク |\n| system | OS の設定に従う |\n\n> [!WARNING]\n> ファクトリーをインポートする前にパッケージをインストールしてください。`,
  },
  {
    title: "ポートフォリオ",
    markdown: `# Atlas のフィールドノート\n\n![開いたノートがある静かな机](https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80)\n\n*調査、執筆、そしてアイデアに立ち返るためのインターフェース。*\n\n## 取り組み\n\nAtlas は散らばったプロジェクトノートを、読める公開記録にまとめます。簡潔なエッセイと検索できるアーカイブを組み合わせた仕組みです。\n\n[ケーススタディを読む](https://riebeckite.dev)\n\n> [!NOTE]\n> プレビューでは外部画像を HTTPS に限定しています。`,
  },
] as const;

export function getShowcaseFixtures(
  locale: WebLocale,
): readonly PreviewFixture[] {
  if (locale !== "ja") return showcaseFixtures;
  return showcaseFixtures.map((fixture, index) => ({
    ...fixture,
    ...japaneseFixtureContent[index],
  }));
}
