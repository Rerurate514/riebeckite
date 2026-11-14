import type { ScaffoldPresetName } from "./presets_languages.js";

export const REPO = "https://github.com/Rerurate514/riebeckite";

export const README_PAGE_LINKS: Readonly<
  Record<string, { readonly en: string; readonly ja: string }>
> = {
  "framework/plugins": { en: "Plugin tour", ja: "プラグインツアー" },
  "framework/themes": { en: "Theme tour", ja: "テーマツアー" },
  guide: { en: "Getting-started guide", ja: "はじめにガイド" },
  examples: { en: "Examples", ja: "サンプル集" },
  "reference/plugins": { en: "Plugin reference", ja: "プラグインリファレンス" },
  "reference/themes": { en: "Theme reference", ja: "テーマリファレンス" },
};

export const README_INTRO: Readonly<
  Record<ScaffoldPresetName, { readonly en: string; readonly ja: string }>
> = {
  empty: {
    en: "A blank Riebeckite application shell — no theme, no plugins, no components, and no content. Everything is yours to add.",
    ja: "空の Riebeckite アプリケーションシェルです。テーマもプラグインもコンポーネントもコンテンツもなく、すべてを自由に追加できます。",
  },
  minimal: {
    en: "The smallest readable Riebeckite site: Obsidian Markdown, the minimal theme, and a single page you can read end to end.",
    ja: "最小で読みやすい Riebeckite サイトです。Obsidian マークダウン・minimal テーマ・1 ページだけで、サイトの組み立て方を学べます。",
  },
  starter: {
    en: "Recommended default: a practical Markdown garden with search, navigation, and reading essentials.",
    ja: "大半のサイトにおすすめの既定構成です。検索・ナビゲーション・閲覧に必要な機能を備えた実用的な Markdown サイトを作れます。",
  },
  "digital-garden": {
    en: "An Obsidian-compatible digital garden with linked notes, backlinks, and a local graph.",
    ja: "Obsidian と互換性のあるデジタルガーデンです。ノート間リンク、バックリンク、ローカルグラフを備えます。",
  },
  blog: {
    en: "A publishing-focused blog with tags, series, related posts, sharing, and feeds.",
    ja: "タグ、シリーズ、関連記事、共有、フィードを備えた公開向けブログです。",
  },
  docs: {
    en: "A documentation site with an automatic sidebar, table of contents, and previous/next navigation.",
    ja: "自動サイドバー、目次、前後ページナビゲーションを備えたドキュメントサイトです。",
  },
  portfolio: {
    en: "A focused portfolio with pages for selected projects, an introduction, and contact details.",
    ja: "選んだプロジェクト、自己紹介、連絡先のページから始められる、要点を絞ったポートフォリオです。",
  },
  showcase: {
    en: "A feature-rich example that demonstrates the Riebeckite plugin ecosystem with rendered samples, reference pages, and local fixtures.",
    ja: "Riebeckite の Plugin エコシステムを実際に確認できる機能紹介用の構成です。描画例・リファレンスページ・ローカルのフィクスチャを含みます。",
  },
};

export const README_WORDS: Readonly<{
  en: Record<string, string>;
  ja: Record<string, string>;
}> = {
  en: {
    included: "What's included",
    languages: "Languages",
    theme: "Theme",
    plugins: "Plugins",
    pages: "Content pages",
    commands: "Commands",
    localization: "Localization",
    localizationBody:
      "Content lives in `content/` as plain Markdown. Translations sit next to the default file using the `<base>.<lang>.md` convention (`about.ja.md`, `about.en.md`). The default language keeps the unsuffixed path; the rest are served under `/lang/`. To add or remove a language, edit the `l10n(...)` plugin in `riebeckite.config.ts` and add or remove the matching translation files.",
    extending: "Extending",
    extendingBody:
      "Plugins and themes are registered in `riebeckite.config.ts`. Install a package, import its factory, and add it to the `plugins` array — or point `theme` at another theme factory. See the Riebeckite repository for the full plugin and theme index.",
    none: "none",
    noPlugins: "no plugins",
    single: "single language",
    configReference: "Configuration reference",
    configReferenceBody:
      "`riebeckite.config.ts` registers every plugin below with its full option set. Treat it as a starting point; the documented options live in the [configuration reference](https://riebeckite.dev/docs/reference/configuration-reference) and each plugin's package README.",
    factory: "Factory",
    options: "Options",
    emDash: "—",
    demoPages: "Try the demos",
    demoPagesBody:
      "The generated site ships content pages that exercise these features:",
    copyDemos: "Copy-paste demos",
    copyDemosBody:
      "Paste any of these snippets into a Markdown file under `content/` and run `npm exec riebeckite dev`. Each one renders through a plugin this preset registers.",
  },
  ja: {
    included: "含まれているもの",
    languages: "言語",
    theme: "テーマ",
    plugins: "プラグイン",
    pages: "コンテンツページ",
    commands: "コマンド",
    localization: "ローカライズ",
    localizationBody:
      "コンテンツは `content/` にプレーンな Markdown として置きます。翻訳ページは既定ファイルの隣に `<base>.<lang>.md` の規則で配置します（`about.ja.md`、`about.en.md` など）。既定言語は接尾辞なしのパス、それ以外は `/lang/` のパスで配信されます。言語の追加・削除は `riebeckite.config.ts` の `l10n(...)` プラグインを編集し、対応する翻訳ファイルを追加・削除してください。",
    extending: "拡張",
    extendingBody:
      "プラグインとテーマは `riebeckite.config.ts` で登録します。パッケージをインストールし、ファクトリを import して `plugins` 配列に追加するか、`theme` を別のテーマファクトリに変更します。全プラグイン・テーマの一覧は Riebeckite リポジトリを参照してください。",
    none: "なし",
    noPlugins: "プラグインなし",
    single: "単一言語",
    configReference: "設定リファレンス",
    configReferenceBody:
      "`riebeckite.config.ts` には、以下の全プラグインが全オプション付きで登録されています。これは出発点として使い、設定の仕様は[設定リファレンス](https://riebeckite.dev/docs/reference/configuration-reference)と各プラグインパッケージの README を確認してください。",
    factory: "ファクトリ",
    options: "オプション",
    emDash: "—",
    demoPages: "デモを試す",
    demoPagesBody:
      "生成されたサイトには、各機能を体験できるコンテンツページが含まれています:",
    copyDemos: "コピーして使えるデモ",
    copyDemosBody:
      "以下のスニペットを `content/` 配下の Markdown ファイルに貼り付けて `npm exec riebeckite dev` を実行してください。それぞれ、このプリセットが登録しているプラグインでレンダリングされます。",
  },
};
