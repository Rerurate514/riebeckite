export type HomeLocale = "ja" | "en";

export const HOME_REPO_URL = "https://github.com/Rerurate514/riebeckite";

export type HomeLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type HomeFeature = {
  title: string;
  body: string;
};

export type HomeStep = HomeFeature & {
  command?: boolean;
};

export type HomeUseCase = {
  title: string;
  body: string;
  href: string;
};

export type HomeCopy = {
  title: string;
  description: string;
  eyebrow: string;
  tagline: string;
  lead: string;
  primaryCta: HomeLink;
  secondaryCta: HomeLink;
  quickLinks: HomeLink[];
  language: HomeLink & { hreflang: HomeLocale };
  what: { heading: string; paragraphs: string[] };
  why: { heading: string; intro: string; features: HomeFeature[] };
  build: { heading: string; intro: string; useCases: HomeUseCase[] };
  extend: {
    heading: string;
    intro: string;
    plugins: { heading: string; body: string; link: HomeLink };
    themes: { heading: string; body: string; link: HomeLink };
  };
  builtWith: {
    heading: string;
    intro: string;
    evidence: string[];
    link: HomeLink;
  };
  start: {
    heading: string;
    intro: string;
    steps: HomeStep[];
    cta: HomeLink;
  };
  explore: { heading: string; links: HomeLink[] };
};

const ja: HomeCopy = {
  title: "Riebeckite — Markdown と Obsidian のサイトフレームワーク",
  description:
    "Markdown や Obsidian のノートから、拡張できる Web サイトを作るオープンソースフレームワークです。コンテンツはそのままに、Plugin と Theme でサイトを組み立てられます。",
  eyebrow: "オープンソース · Apache-2.0",
  tagline: "Markdown と Obsidian のノートから、拡張できる Web サイトを作る。",
  lead: "コンテンツの置き場所はそのままに、Plugin と Theme でサイトを組み立てられます。",
  primaryCta: { label: "はじめる", href: "/docs/getting-started/" },
  secondaryCta: { label: "GitHub", href: HOME_REPO_URL, external: true },
  quickLinks: [
    { label: "ドキュメント", href: "/docs/" },
    { label: "Plugin", href: "/docs/plugins/" },
    { label: "Theme", href: "/docs/themes/" },
  ],
  language: { label: "English", href: "/en/", hreflang: "en" },
  what: {
    heading: "Riebeckite とは",
    paragraphs: [
      "Riebeckite は、Markdown や Obsidian のノートを Web サイトとして公開するためのオープンソースフレームワークです。",
      "content/ に Markdown を置いてビルドすると、静的なファイルとして出力されます。Plugin で検索や図表、多言語化などの機能を足し、Theme で見た目を選べます。",
      "Riebeckite 本体をクローンする必要はありません。create-riebeckite がサイトのファイル一式を生成します。",
    ],
  },
  why: {
    heading: "Riebeckite を選ぶ理由",
    intro: "コンテンツ、機能、見た目をそれぞれ独立して扱えます。",
    features: [
      {
        title: "Markdown がそのまま",
        body: "content/ の Markdown をそのまま公開できます。専用の記法を覚え直す必要はありません。",
      },
      {
        title: "Obsidian Vault を接続",
        body: "既存の Obsidian Vault を content source として使い、公開するノートだけを選べます。",
      },
      {
        title: "Plugin で機能追加",
        body: "検索、図表、埋め込み、多言語化などを Plugin として追加できます。不要なものは入れません。",
      },
      {
        title: "Theme で見た目を変更",
        body: "Theme を切り替えても、コンテンツや Plugin の機能はそのままです。",
      },
      {
        title: "多言語サイト",
        body: "日本語と英語など複数言語のページを扱えます。それぞれに canonical と hreflang が出力されます。",
      },
      {
        title: "公開範囲を制御",
        body: "draft や private、未公開のノートを公開サイトに含めずに管理できます。",
      },
    ],
  },
  build: {
    heading: "作れるもの",
    intro: "同じ仕組みで、目的の違うサイトを作れます。",
    useCases: [
      {
        title: "Digital Garden",
        body: "ノート同士をリンクでつないで公開する。",
        href: "/docs/guides/obsidian",
      },
      {
        title: "Documentation",
        body: "サイドバーと検索を備えたドキュメント。",
        href: "/docs/plugins/docs",
      },
      {
        title: "Blog",
        body: "記事を書き続け、タグやアーカイブで整理する。",
        href: "/docs/guides/writing-content",
      },
      {
        title: "Personal Website",
        body: "プロフィールや作品をまとめる個人サイト。",
        href: "/docs/themes/",
      },
    ],
  },
  extend: {
    heading: "拡張する",
    intro: "必要な機能と見た目を選べます。",
    plugins: {
      heading: "Plugin",
      body: "公式の Plugin カタログから、Markdown の処理、図表、検索、ナビゲーション、公開と SEO などの機能を追加できます。",
      link: { label: "Plugin を探す", href: "/docs/plugins/" },
    },
    themes: {
      heading: "Theme",
      body: "Theme は見た目だけを担当します。複数の公式 Theme から選び、後から切り替えられます。",
      link: { label: "Theme を見る", href: "/docs/themes/" },
    },
  },
  builtWith: {
    heading: "このサイトも Riebeckite 製です",
    intro:
      "riebeckite.dev 自身が Riebeckite で動いており、次の機能を使っています。",
    evidence: [
      "ナビゲーション",
      "検索",
      "目次",
      "パンくず",
      "バックリンク",
      "多言語切り替え",
      "Obsidian 記法",
      "Mermaid",
    ],
    link: { label: "Plugin の使用例を見る", href: "/docs/plugins/showcase" },
  },
  start: {
    heading: "はじめかた",
    intro: "create-riebeckite から新しいサイトを作成します。",
    steps: [
      { title: "サイトを作成", body: "npx create-riebeckite", command: true },
      {
        title: "Markdown を書く",
        body: "content/ にノートを追加し、公開するページに publish: true を付けます。",
      },
      {
        title: "ローカルで確認",
        body: "npm exec riebeckite dev でブラウザから確認します。",
        command: true,
      },
      {
        title: "ビルドして公開",
        body: "npm exec riebeckite build で dist/ を出力し、そのままデプロイできます。",
        command: true,
      },
    ],
    cta: { label: "Getting Started を読む", href: "/docs/getting-started/" },
  },
  explore: {
    heading: "さらに詳しく",
    links: [
      { label: "ドキュメント", href: "/docs/" },
      { label: "Guides", href: "/docs/guides/" },
      { label: "Reference", href: "/docs/reference/" },
      { label: "Framework", href: "/docs/framework/" },
    ],
  },
};

const en: HomeCopy = {
  title: "Riebeckite — Markdown & Obsidian Website Framework",
  description:
    "Riebeckite is an open-source framework for building extensible websites from Markdown and Obsidian notes. Keep your content, add plugins and themes, and publish the site you want.",
  eyebrow: "Open source · Apache-2.0",
  tagline: "Turn Markdown and Obsidian notes into an extensible website.",
  lead: "Keep your content where it is. Add plugins, choose a theme, and build the site you want.",
  primaryCta: { label: "Get started", href: "/en/docs/getting-started/" },
  secondaryCta: { label: "GitHub", href: HOME_REPO_URL, external: true },
  quickLinks: [
    { label: "Documentation", href: "/en/docs/" },
    { label: "Plugins", href: "/en/docs/plugins/" },
    { label: "Themes", href: "/en/docs/themes/" },
  ],
  language: { label: "日本語", href: "/", hreflang: "ja" },
  what: {
    heading: "What is Riebeckite?",
    paragraphs: [
      "Riebeckite is an open-source framework for publishing Markdown and Obsidian notes as a website.",
      "Write Markdown in content/ and build it into static files. Add features like search, diagrams, and localization with plugins, and pick a look with a theme.",
      "You do not clone the Riebeckite repository. create-riebeckite generates the files for a new site.",
    ],
  },
  why: {
    heading: "Why Riebeckite",
    intro: "Content, features, and presentation stay independent.",
    features: [
      {
        title: "Your Markdown as-is",
        body: "Publish the Markdown in content/ directly. There is no separate syntax to learn.",
      },
      {
        title: "Connect an Obsidian vault",
        body: "Use an existing Obsidian vault as the content source and publish only the notes you choose.",
      },
      {
        title: "Add plugins",
        body: "Search, diagrams, embeds, and localization are available as plugins. Add only what you need.",
      },
      {
        title: "Change with themes",
        body: "Switching a theme leaves your content and plugin features untouched.",
      },
      {
        title: "Multilingual sites",
        body: "Handle pages in more than one language, each with its own canonical and hreflang output.",
      },
      {
        title: "Control what is public",
        body: "Keep draft, private, and unpublished notes out of the published site.",
      },
    ],
  },
  build: {
    heading: "What you can build",
    intro: "One framework, several kinds of site.",
    useCases: [
      {
        title: "Digital garden",
        body: "Publish notes connected by links.",
        href: "/en/docs/guides/obsidian",
      },
      {
        title: "Documentation",
        body: "Docs with a sidebar and search.",
        href: "/en/docs/plugins/docs",
      },
      {
        title: "Blog",
        body: "Keep writing and organize posts with tags and archives.",
        href: "/en/docs/guides/writing-content",
      },
      {
        title: "Personal website",
        body: "A personal site for a profile and work.",
        href: "/en/docs/themes/",
      },
    ],
  },
  extend: {
    heading: "Extend it",
    intro: "Choose the features and the look you want.",
    plugins: {
      heading: "Plugins",
      body: "Add Markdown processing, diagrams, search, navigation, publishing, and SEO features from the official plugin catalog.",
      link: { label: "Browse plugins", href: "/en/docs/plugins/" },
    },
    themes: {
      heading: "Themes",
      body: "Themes handle presentation only. Choose from the official themes and change it later.",
      link: { label: "Explore themes", href: "/en/docs/themes/" },
    },
  },
  builtWith: {
    heading: "This site is built with Riebeckite",
    intro: "riebeckite.dev runs on Riebeckite itself and uses these features.",
    evidence: [
      "Navigation",
      "Search",
      "Table of contents",
      "Breadcrumbs",
      "Backlinks",
      "Language switcher",
      "Obsidian syntax",
      "Mermaid",
    ],
    link: { label: "See plugins in action", href: "/en/docs/plugins/showcase" },
  },
  start: {
    heading: "Get started",
    intro: "Create a new site with create-riebeckite.",
    steps: [
      { title: "Create a site", body: "npx create-riebeckite", command: true },
      {
        title: "Write Markdown",
        body: "Add notes to content/ and set publish: true on the pages you want to publish.",
      },
      {
        title: "Preview locally",
        body: "Run npm exec riebeckite dev and open the local URL.",
        command: true,
      },
      {
        title: "Build and deploy",
        body: "Run npm exec riebeckite build to output dist/, then deploy it.",
        command: true,
      },
    ],
    cta: { label: "Read Getting Started", href: "/en/docs/getting-started/" },
  },
  explore: {
    heading: "Go deeper",
    links: [
      { label: "Documentation", href: "/en/docs/" },
      { label: "Guides", href: "/en/docs/guides/" },
      { label: "Reference", href: "/en/docs/reference/" },
      { label: "Framework", href: "/en/docs/framework/" },
    ],
  },
};

export function getHomeCopy(locale: HomeLocale): HomeCopy {
  return locale === "ja" ? ja : en;
}

export function getHomePath(locale: HomeLocale): string {
  return locale === "ja" ? "/" : "/en/";
}

export function buildSoftwareApplicationSchema(
  locale: HomeLocale,
  url: string,
): Record<string, unknown> {
  const copy = getHomeCopy(locale);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Riebeckite",
    description: copy.description,
    url,
    applicationCategory: "DeveloperApplication",
    codeRepository: HOME_REPO_URL,
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    isAccessibleForFree: true,
    inLanguage: locale === "ja" ? "ja-JP" : "en-US",
  };
}
