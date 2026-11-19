import type { HomeLocale } from "../../lib/home";

type HomeContent = {
  prefix: string;
  title: string;
  lead: string;
  start: string;
  create: string;
  language: {
    href: string;
    lang: string;
    label: string;
  };
  conversion: {
    title: string;
    description: string;
    sourceLabel: string;
    outputLabel: string;
  };
  extensions: {
    title: string;
    description: string;
    details: string;
    pluginsLink: string;
    themesLink: string;
  };
  project: {
    title: string;
    description: string;
    contentTitle: string;
    contentBefore: string;
    contentAfter: string;
    interfaceTitle: string;
    interfaceDescription: string;
    settingsTitle: string;
    settingsBefore: string;
  };
};

export const content: Record<HomeLocale, HomeContent> = {
  en: {
    prefix: "",
    title: "A TypeScript framework for Markdown and Obsidian sites.",
    lead: "Build a static site from Markdown or an Obsidian vault. Keep routes, components, and styles in an application you own.",
    start: "Start a project",
    create: "Create a project",
    language: { href: "/ja/", lang: "ja", label: "日本語" },
    conversion: {
      title: "From Markdown to a page",
      description:
        "The build pipeline parses frontmatter, Markdown, and Obsidian WikiLinks before it writes a page.",
      sourceLabel: "Markdown source",
      outputLabel: "Published page",
    },
    extensions: {
      title: "Add only what your site needs",
      description:
        "Plugins and themes are packages. Your application keeps control of where they run and how the site is assembled.",
      details:
        "This configuration adds site search. Plugins can also add transforms, renderers, pages, browser behavior, endpoints, SEO, and diagnostics. Themes provide tokens and styles without defining the application structure.",
      pluginsLink: "Browse plugins",
      themesLink: "Explore themes",
    },
    project: {
      title: "A project you can read",
      description:
        "Generated projects use ordinary files, so each change has an obvious home.",
      contentTitle: "Content",
      contentBefore: "Keep Markdown in",
      contentAfter:
        "so notes can grow and move without changing the application.",
      interfaceTitle: "Interface",
      interfaceDescription: "for the pages and UI your readers use.",
      settingsTitle: "Settings",
      settingsBefore: "Choose plugins, themes, and content sources in",
    },
  },
  ja: {
    prefix: "/ja",
    title: "Markdown と Obsidian のサイトをつくる TypeScript フレームワーク",
    lead: "Markdown と Obsidian のノートから静的サイトを生成します。ルート、コンポーネント、スタイルは、自分のアプリケーションで管理できます。",
    start: "プロジェクトを始める",
    create: "プロジェクトを作成する",
    language: { href: "/", lang: "en", label: "English" },
    conversion: {
      title: "Markdown からページへ",
      description:
        "ビルド時に Frontmatter、Markdown、Obsidian WikiLink を処理し、ページを書き出します。",
      sourceLabel: "Markdown のソース",
      outputLabel: "公開されるページ",
    },
    extensions: {
      title: "必要な機能だけを追加する",
      description:
        "Plugin と Theme はパッケージです。どこで動かし、サイトをどう組み立てるかはアプリケーション側で決めます。",
      details:
        "この設定ではサイト内検索を追加しています。Plugin は変換、レンダラー、ページ、ブラウザ側の動作、エンドポイント、SEO、診断も追加できます。Theme はトークンとスタイルを提供し、アプリケーションの構造は決めません。",
      pluginsLink: "Plugin を探す",
      themesLink: "Theme を見る",
    },
    project: {
      title: "読めるプロジェクト",
      description:
        "通常のファイルで構成されるため、変更する場所がすぐに分かります。",
      contentTitle: "コンテンツ",
      contentBefore: "Markdown は",
      contentAfter:
        "に置きます。ノートを増やしたり移動したりしても、アプリケーションは変えずに済みます。",
      interfaceTitle: "UI",
      interfaceDescription: "には、読者が使うページと UI を置きます。",
      settingsTitle: "設定",
      settingsBefore: "Plugin、Theme、コンテンツソースは",
    },
  },
};

export const demoSource = `---
title: Hello
---

## Hello

My **first** note.

[Getting started](/docs/getting-started)`;
export type { HomeContent };
