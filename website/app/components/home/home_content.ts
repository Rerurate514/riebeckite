import type { HomeLocale } from "../../lib/home";

type HomeContent = {
  prefix: string;
  wordmarkLabel: string;
  eyebrow: string;
  title: string;
  lead: string;
  start: string;
  create: string;
  exampleKicker: string;
  exampleTitle: string;
  exampleCopy: string;
  exampleLink: string;
  explore: [string, string, string];
  previewNav: string;
  previewLinks: [string, string, string];
  previewKicker: string;
  previewTitle: string;
  previewCopy: string;
  conversion: [string, string, string];
  extensions: [string, string, string, string, string, string];
  recipes: [string, string, string, string, string, string, string];
  project: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  workflow: [string, string, string, string, string, string, string, string];
  gallery: [string, string, string, string, string, string];
  continue: [string, string, string, string, string];
  language: [string, string, string];
};

export const content: Record<HomeLocale, HomeContent> = {
  en: {
    prefix: "",
    wordmarkLabel: "Riebeckite home",
    eyebrow: "Open source · Apache-2.0 · TypeScript",
    title: "Markdown is where your site begins.",
    lead: "Build a static site from Markdown or an Obsidian vault, while keeping routes, components, and styles in an application you own.",
    start: "Start a project",
    create: "Create a project",
    exampleKicker: "Team notes / Development",
    exampleTitle: "Set up a development environment for new team members.",
    exampleCopy:
      "Keep the Node.js version, required environment variables, and local startup steps in one place. Update this page when they change.",
    exampleLink: "See how content is organized →",
    explore: [
      "A framework, not a theme",
      "See the pieces of a published site together.",
      "Start from Markdown, then choose the navigation, discovery tools, theme, and routes that make the site yours. These are the same surfaces available to a generated project.",
    ],
    previewNav: "Preview navigation",
    previewLinks: ["Onboarding", "Development", "Meeting notes"],
    previewKicker: "Development / Releases",
    previewTitle: "This week's release checklist",
    previewCopy:
      "Review the changes, test in staging, and complete the checks after publishing.",
    conversion: [
      "Markdown → Web",
      "Write the note. Publish the page.",
      "The same Riebeckite pipeline that builds a site parses frontmatter, Markdown, and Obsidian WikiLinks here.",
    ],
    extensions: [
      "npm packages",
      "Add the feature your site needs.",
      "Install a package, register it in the configuration, and decide where its components belong in your routes.",
      "This example adds site search. Plugins can also add transforms, renderers, standalone pages, browser behavior, endpoints, SEO, and diagnostics. Themes supply tokens and styles without deciding the application structure.",
      "Browse plugins",
      "Explore themes",
    ],
    recipes: [
      "Choose by outcome",
      "Find a Plugin by what you want to publish.",
      "Start with a site need rather than a package name. Each guide covers setup and the pieces you add to your routes.",
      "Search",
      "Help readers find notes.",
      "Related posts",
      "Connect writing by content.",
    ],
    project: [
      "A project you can read",
      "Keep content, interface, and settings separate.",
      "Generated projects use ordinary files, so each change has an obvious home. Writing stays separate from the interface around it, while one configuration file describes the site you are assembling.",
      "Content",
      "Keep Markdown in",
      "so notes can grow and move without changing the application.",
      "Interface",
      "for the pages and UI your readers use.",
      "Settings",
      "Choose plugins, themes, and content sources in",
    ],
    workflow: [
      "From draft to live site",
      "Keep the publishing path short.",
      "Create",
      "Generate the project.",
      "Write",
      "Add Markdown to your content source.",
      "Review",
      "Build and inspect the output.",
    ],
    gallery: [
      "Working references",
      "Open the parts before choosing them.",
      "Compare official themes, see plugins running together, or read how to customize the site around your content.",
      "Theme previews",
      "Plugin showcase",
      "Customization guide",
    ],
    continue: [
      "Publish the build you reviewed.",
      "Build output is written to",
      "The deployment guide covers local Cloudflare Workers publishing, GitHub Actions, and separate content repositories.",
      "Getting started",
      "Deployment",
    ],
    language: ["/ja/", "ja", "日本語"],
  },
  ja: {
    prefix: "/ja",
    wordmarkLabel: "Riebeckite ホーム",
    eyebrow: "オープンソース · Apache-2.0 · TypeScript",
    title: "Markdown から、自分の Web をつくる。",
    lead: "Riebeckite は Markdown と Obsidian のノートを静的サイトに変換し、ルート、コンポーネント、見た目は自分で管理できる TypeScript フレームワークです。",
    start: "プロジェクトを始める",
    create: "プロジェクトを作成する",
    exampleKicker: "チームノート / 開発ガイド",
    exampleTitle: "新しいメンバーの開発環境をセットアップする。",
    exampleCopy:
      "Node.js のバージョン、必要な環境変数、ローカルでの起動手順をまとめます。更新があればこのページだけを直せます。",
    exampleLink: "コンテンツの置き方を見る →",
    explore: [
      "Theme だけではないフレームワーク",
      "公開するサイト全体を、ひとつずつ組み立てる。",
      "Markdown を起点に、ナビゲーション、見つけやすさ、Theme、ルートまでを選べます。ここにある要素は、生成したプロジェクトでもそのまま使えます。",
    ],
    previewNav: "プレビューのナビゲーション",
    previewLinks: ["入社ガイド", "開発手順", "議事録"],
    previewKicker: "開発手順 / リリース",
    previewTitle: "今週のリリース手順",
    previewCopy:
      "変更内容の確認、ステージング環境でのテスト、公開後の確認項目を順番に進めます。",
    conversion: [
      "Markdown → Web",
      "ノートを書き、そのままページにする。",
      "この表示にも、サイトをビルドするときと同じ Riebeckite Pipeline を使っています。Frontmatter、Markdown、Obsidian WikiLink を処理します。",
    ],
    extensions: [
      "npm パッケージ",
      "サイトに必要な機能を、npm で足す。",
      "パッケージを導入して設定に登録し、コンポーネントをどのルートで使うかはサイト側で決めます。",
      "この例ではサイト内検索を追加します。Plugin では変換、レンダラー、単独ページ、ブラウザ側の動作、エンドポイント、SEO、診断も追加できます。Theme はトークンとスタイルを提供し、アプリケーションの構造は決めません。",
      "Plugin を探す",
      "Theme を見る",
    ],
    recipes: [
      "目的から選ぶ",
      "追加したい機能から Plugin を探す。",
      "パッケージ名ではなく、サイトで実現したいことから始められます。各ガイドでは設定とルートへの組み込み方を案内します。",
      "検索",
      "ノートを見つけやすくする。",
      "関連記事",
      "内容で文章をつなげる。",
    ],
    project: [
      "読めるプロジェクト",
      "コンテンツ、UI、設定を分けて置く。",
      "生成されるのは通常のファイルなので、変更する場所がすぐに分かります。書いたもの、読者が触れる UI、サイトの設定を、それぞれ独立して育てられます。",
      "コンテンツ",
      "Markdown は",
      "に置きます。ノートを増やしたり移動したりしても、アプリケーションは変えずに済みます。",
      "UI",
      "には、読者が使うページと UI を置きます。",
      "設定",
      "Plugin、Theme、コンテンツソースは",
    ],
    workflow: [
      "下書きから公開まで",
      "公開までの流れを、短く保つ。",
      "作成",
      "プロジェクトを生成する。",
      "書く",
      "コンテンツソースに Markdown を追加する。",
      "確認",
      "ビルドして出力を確認する。",
    ],
    gallery: [
      "動くものを見る",
      "選ぶ前に、実際の表示を確かめる。",
      "公式Themeを比べ、Pluginが一緒に動く様子を見て、コンテンツに合わせたサイトの整え方を確認できます。",
      "Theme プレビュー",
      "Plugin の動作例",
      "サイトのカスタマイズ",
    ],
    continue: [
      "確認したビルドを公開する。",
      "ビルド出力は",
      "に書き出されます。デプロイガイドでは、Cloudflare Workers へのローカル公開、GitHub Actions、コンテンツリポジトリの分離を案内しています。",
      "始める",
      "デプロイ",
    ],
    language: ["/", "en", "English"],
  },
};

export const demoSource = `---
title: Hello
---

## Hello

My **first** note.

[Getting started](/docs/getting-started)`;
export type { HomeContent };
