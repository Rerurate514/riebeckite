export type HomeLocale = "ja" | "en";

const HOME_REPO_URL = "https://github.com/Rerurate514/riebeckite";

export type HomeLink = { label: string; href: string; external?: boolean };

type HomeFeature = { title: string; body: string; code: string };

export type HomeCopy = {
  title: string;
  description: string;
  eyebrow: string;
  copyLabel: string;
  primaryCta: HomeLink;
  showcaseCta: HomeLink;
  githubCta: HomeLink;
  language: HomeLink & { hreflang: HomeLocale };
  hero: {
    title: string;
    lead: string;
    command: string;
    previewLabel: string;
    previewStatus: string;
    previewTitle: string;
    previewBody: string;
  };
  workflow: {
    heading: string;
    intro: string;
    sourceLabel: string;
    source: string;
    statement: string;
    points: string[];
  };
  development: { heading: string; intro: string; features: HomeFeature[] };
  extension: {
    heading: string;
    intro: string;
    statement: string;
    points: string[];
    code: string;
    plugins: HomeLink;
    themes: HomeLink;
  };
  start: { heading: string; intro: string; command: string; docs: HomeLink };
};

const en: HomeCopy = {
  title: "Riebeckite — Markdown & Obsidian Website Framework",
  description:
    "Build and publish a website from Markdown and Obsidian notes with a TypeScript framework, independent plugins, themes, and content sources.",
  eyebrow: "Open source · Apache-2.0 · TypeScript",
  copyLabel: "Copy",
  primaryCta: { label: "Get started", href: "/docs/getting-started/" },
  showcaseCta: {
    label: "See the plugin showcase →",
    href: "/docs/plugins/showcase",
  },
  githubCta: { label: "GitHub", href: HOME_REPO_URL, external: true },
  language: { label: "日本語", href: "/ja/", hreflang: "ja" },
  hero: {
    title: "A website for your Markdown and Obsidian notes.",
    lead: "Riebeckite is a TypeScript framework for publishing notes as a static site and shaping the result with your own routes, components, plugins, and theme.",
    command: "npx create-riebeckite",
    previewLabel: "Preview of a Riebeckite website",
    previewStatus: "published",
    previewTitle: "Notes can become a site you maintain.",
    previewBody:
      "Keep Markdown as the source, then use ordinary web tools for the parts around it.",
  },
  workflow: {
    heading: "Write in Markdown. Publish a real website.",
    intro:
      "Read content from content/ or an external Obsidian vault. The build turns it into static output for the host you choose.",
    sourceLabel: "content/notes/ownership.md",
    source:
      "# Ownership\n\nA site should remain understandable after its framework changes.\n\nSee also: [[architecture]]",
    statement:
      "Use the notes you already write as the source for pages, links, and navigation.",
    points: [
      "Obsidian-flavored Markdown and WikiLinks through the official plugin",
      "Static output written to dist/",
      "Content may live outside the site repository",
    ],
  },
  development: {
    heading: "Use the web stack you know.",
    intro:
      "A generated site is an ordinary TypeScript application. Its routes and components belong to the site; framework capabilities remain package dependencies.",
    features: [
      {
        title: "Routes and components",
        body: "Write Hono JSX components directly and decide where plugin UI appears.",
        code: "app/routes/index.tsx",
      },
      {
        title: "Content sources",
        body: "Keep implementation and notes separate when they need independent repositories.",
        code: 'directory: "../vault"',
      },
      {
        title: "Dependencies",
        body: "Install and update the framework, themes, and plugins through your package manager.",
        code: "plugins: [obsidianMarkdown()]",
      },
    ],
  },
  extension: {
    heading: "Add only the capabilities your site needs.",
    intro:
      "Plugins transform content, provide components, add client entries, or generate pages. Themes handle presentation without taking ownership of those features.",
    statement:
      "Configure plugins in one place, then keep site-specific decisions in your application.",
    points: [
      "Markdown and HTML transformations",
      "Reusable UI and browser behavior",
      "Independently versioned plugins and themes",
    ],
    code: 'import { defineConfig } from "@riebeckite/core";\nimport { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";\n\nexport default defineConfig({\n  plugins: [obsidianMarkdown()],\n});',
    plugins: { label: "Browse plugins and APIs →", href: "/docs/plugins/" },
    themes: { label: "Explore themes →", href: "/docs/themes/" },
  },
  start: {
    heading: "Start with one command.",
    intro:
      "The generator asks for a project name, preset, content source, and deployment option. Run the generated site locally when it is ready.",
    command:
      "npx create-riebeckite\ncd my-site\nnpm install\nnpm exec riebeckite dev",
    docs: { label: "Read the documentation", href: "/docs/" },
  },
};

const ja: HomeCopy = {
  ...en,
  title: "Riebeckite — Markdown と Obsidian のサイトフレームワーク",
  description:
    "Markdown と Obsidian のノートから、TypeScript、独立した Plugin・Theme・コンテンツソースを使った Web サイトを作成・公開するフレームワークです。",
  eyebrow: "オープンソース · Apache-2.0 · TypeScript",
  copyLabel: "コピー",
  primaryCta: { label: "はじめる", href: "/ja/docs/getting-started/" },
  showcaseCta: {
    label: "Plugin の実例を見る →",
    href: "/ja/docs/plugins/showcase",
  },
  language: { label: "English", href: "/", hreflang: "en" },
  hero: {
    title: "Markdown と Obsidian のノートを、育てられる Web サイトへ。",
    lead: "Riebeckite は、ノートを静的サイトとして公開し、ルート、コンポーネント、Plugin、Theme を自分で組み立てるための TypeScript フレームワークです。",
    command: en.hero.command,
    previewLabel: "Riebeckite でつくったサイトのプレビュー",
    previewStatus: "公開済み",
    previewTitle: "ノートは、管理できるサイトになる。",
    previewBody:
      "Markdown を起点に、周辺の体験は使い慣れた Web 技術でつくれます。",
  },
  workflow: {
    heading: "Markdown で書き、Web サイトとして公開する。",
    intro:
      "content/ または外部の Obsidian Vault からコンテンツを読み込み、選んだホスティング先に向けて静的ファイルを出力します。",
    sourceLabel: "content/notes/ownership.md",
    source: en.workflow.source,
    statement:
      "普段書いているノートを、ページ・リンク・ナビゲーションの出発点にできます。",
    points: [
      "公式 Plugin による Obsidian 記法と WikiLink の対応",
      "dist/ への静的ファイル出力",
      "サイトのリポジトリとは別にコンテンツを管理可能",
    ],
  },
  development: {
    heading: "使い慣れた Web 技術で開発する。",
    intro:
      "生成されるサイトは通常の TypeScript アプリケーションです。ルートとコンポーネントはサイトが持ち、フレームワークの機能はパッケージの依存関係として扱います。",
    features: [
      {
        title: "ルートとコンポーネント",
        body: "Hono JSX のコンポーネントをそのまま書き、Plugin の UI をどこに置くか決められます。",
        code: "app/routes/index.tsx",
      },
      {
        title: "コンテンツソース",
        body: "実装とノートを別々のリポジトリで管理したいときにも対応できます。",
        code: 'directory: "../vault"',
      },
      {
        title: "依存関係",
        body: "フレームワーク、Theme、Plugin はパッケージマネージャーで導入・更新します。",
        code: "plugins: [obsidianMarkdown()]",
      },
    ],
  },
  extension: {
    heading: "必要な機能だけを追加する。",
    intro:
      "Plugin はコンテンツ変換、コンポーネント、クライアントエントリ、ページ生成を担えます。Theme は機能の責任を持たず、見た目を扱います。",
    statement:
      "Plugin は一箇所で設定し、サイト固有の判断はアプリケーション側に残せます。",
    points: [
      "Markdown・HTML の変換",
      "再利用できる UI とブラウザ機能",
      "独立してバージョン管理できる Plugin と Theme",
    ],
    code: en.extension.code,
    plugins: { label: "Plugin と API を見る →", href: "/ja/docs/plugins/" },
    themes: { label: "Theme を見る →", href: "/ja/docs/themes/" },
  },
  start: {
    heading: "まずはひとつのコマンドから。",
    intro:
      "ジェネレーターでプロジェクト名、Preset、コンテンツソース、デプロイ方法を選びます。作成後はローカルでサイトを起動できます。",
    command: en.start.command,
    docs: { label: "ドキュメントを読む", href: "/ja/docs/" },
  },
};

export function getHomeCopy(locale: HomeLocale): HomeCopy {
  return locale === "ja" ? ja : en;
}
export function getHomePath(locale: HomeLocale): string {
  return locale === "en" ? "/" : "/ja/";
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
