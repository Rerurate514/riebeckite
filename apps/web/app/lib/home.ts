export type HomeLocale = "ja" | "en";

const HOME_REPO_URL = "https://github.com/Rerurate514/riebeckite";

export type HomeLink = {
  label: string;
  href: string;
  external?: boolean;
};

type HomeFeature = {
  title: string;
  body: string;
  code?: string;
};

type HomeStep = {
  title: string;
  body: string;
};

export type HomeCopy = {
  title: string;
  description: string;
  eyebrow: string;
  primaryCta: HomeLink;
  showcaseCta: HomeLink;
  githubCta: HomeLink;
  language: HomeLink & { hreflang: HomeLocale };
  hero: {
    title: string;
    tagline: string;
    lead: string;
    command: string;
    previewLabel: string;
    previewStatus: string;
    previewTitle: string;
    previewBody: string;
  };
  developer: { heading: string; intro: string; features: HomeFeature[] };
  ownership: {
    heading: string;
    statement: string;
    body: string;
    code: string;
    principles: string[];
  };
  notes: { heading: string; intro: string; steps: HomeStep[] };
  start: {
    heading: string;
    statement: string;
    intro: string;
    command: string;
    terminalLabel: string;
    terminalNote: string;
    link: HomeLink;
  };
  extend: {
    heading: string;
    statement: string;
    intro: string;
    points: string[];
    code: string;
    link: HomeLink;
    themeLink: HomeLink;
  };
  frustration: { heading: string; statement: string; body: string };
  closing: { heading: string; body: string; docs: HomeLink };
};

const en: HomeCopy = {
  title: "Riebeckite — Markdown & Obsidian Website Framework",
  description:
    "Turn Markdown and Obsidian notes into a website you own. Riebeckite is a TypeScript framework with independent plugins, themes, and content sources.",
  eyebrow: "Open source · Apache-2.0 · TypeScript",
  primaryCta: { label: "Get started", href: "/docs/getting-started/" },
  showcaseCta: { label: "Explore showcase", href: "/docs/plugins/showcase" },
  githubCta: { label: "GitHub", href: HOME_REPO_URL, external: true },
  language: { label: "日本語", href: "/ja/", hreflang: "ja" },
  hero: {
    title: "Your content. Your code. Your framework.",
    tagline: "Publish your knowledge. Build without limits.",
    lead: "Turn your Obsidian notes and Markdown into a website you truly own. Built with TypeScript, powered by plugins, and designed around your workflow.",
    command: "npx create-riebeckite",
    previewLabel: "Preview of a Riebeckite website",
    previewStatus: "published",
    previewTitle: "A site is more than its notes.",
    previewBody:
      "Use your Markdown as a source, then shape the experience with the same web tools you already know.",
  },
  developer: {
    heading: "Built for developers, not against them.",
    intro:
      "Riebeckite stays close to the web platform, so your site can remain an ordinary TypeScript project instead of a framework-shaped exception.",
    features: [
      {
        title: "Familiar Web Development",
        body: "Use TypeScript, Hono JSX, CSS, and the tools that already fit your team. Your app owns its routes and components.",
        code: "app/routes/index.tsx",
      },
      {
        title: "Components That Feel Natural",
        body: "Compose Hono JSX components directly. Plugins can export UI, while the site decides where that UI belongs.",
        code: 'import { SeriesList } from "@example/plugin";',
      },
      {
        title: "Content and Code, Separated",
        body: "Point content.directory at a vault outside the site root when your notes and site implementation need independent homes.",
        code: 'directory: "../vault"',
      },
      {
        title: "An Extensible Ecosystem",
        body: "Install and version plugins and themes as packages. Add the smallest capability your site needs, then configure it in one place.",
        code: "plugins: [obsidianMarkdown()]",
      },
    ],
  },
  ownership: {
    heading: "Your site shouldn't be your framework.",
    statement:
      "Keep the framework in dependencies. Keep your site in your repository.",
    body: "A generated Riebeckite site is a normal application that depends on published @riebeckite packages. Site code, content, themes, and plugins have clear owners. Upgrades can still require migration work when changes are breaking, but they do not require carrying the framework source in your site.",
    code: '{\n  "dependencies": {\n    "@riebeckite/core": "^0.x",\n    "@riebeckite/theme-default": "^0.x"\n  }\n}',
    principles: [
      "Manage dependencies with your package manager",
      "Keep framework and site responsibilities separate",
      "Version plugins as independent npm packages",
      "Use a separate repository for content when it helps",
    ],
  },
  notes: {
    heading: "From notes to website.",
    intro:
      "The build starts with the files you write and ends with publishable static output. Add only the transformations and presentation your content calls for.",
    steps: [
      {
        title: "Obsidian Vault",
        body: "Read Markdown from content/ or an external vault. Obsidian-flavored Markdown, including WikiLinks, is supported by the official plugin.",
      },
      {
        title: "Riebeckite",
        body: "Plugins transform Markdown and HTML, extend the content graph, and add browser behavior or generated pages when needed.",
      },
      {
        title: "Published Website",
        body: "A theme controls presentation while the static-site build writes the output to dist/ for your host.",
      },
    ],
  },
  start: {
    heading: "Start in seconds.",
    statement:
      "One interactive command creates the site. The next two commands run it locally.",
    intro:
      "Choose a project name, preset, content source, and deployment option in the generator. The local-first default leaves publishing for when you are ready.",
    command:
      "npx create-riebeckite\ncd my-site\nnpm install\nnpm exec riebeckite dev",
    terminalLabel: "Commands to create and run a Riebeckite site",
    terminalNote:
      "Copy the commands, then open the local URL printed by the development server.",
    link: {
      label: "Read the Quick Start →",
      href: "/docs/getting-started/quick-start",
    },
  },
  extend: {
    heading: "Extend everything.",
    statement: "Features travel as plugins. Presentation travels as themes.",
    intro:
      "A plugin can transform Markdown and HTML, provide components, add client entries, or generate pages. A theme changes appearance without taking ownership of those features.",
    points: [
      "Publish reusable features as npm packages",
      "Configure site capabilities with defineConfig()",
      "Keep Markdown, content, and UI extension points explicit",
      "Develop and version themes independently from plugins",
    ],
    code: 'import { defineConfig } from "@riebeckite/core";\nimport { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";\n\nexport default defineConfig({\n  plugins: [obsidianMarkdown()],\n});',
    link: { label: "Browse plugins and their APIs →", href: "/docs/plugins/" },
    themeLink: { label: "Explore themes →", href: "/docs/themes/" },
  },
  frustration: {
    heading: "Built from frustration. Designed for freedom.",
    statement:
      "Riebeckite began with a desire for a more direct way to build on top of a knowledge base.",
    body: "Working with Quartz 4 made the trade-offs around client UI, interactive behavior, content ownership, and framework-specific conventions clear. Riebeckite takes a different path: standard web development where possible, explicit extension points where useful, and a site architecture you can make your own. It is not a comparison scorecard; it is a framework shaped by a different set of priorities.",
  },
  closing: {
    heading: "Your knowledge deserves a better home.",
    body: "Start with Markdown. Keep the freedom to turn it into the site you have in mind.",
    docs: { label: "View documentation", href: "/docs/" },
  },
};

const ja: HomeCopy = {
  ...en,
  title: "Riebeckite — Markdown と Obsidian のサイトフレームワーク",
  description:
    "Markdown と Obsidian のノートを、自分で所有・拡張できる Web サイトへ変換する TypeScript フレームワークです。",
  eyebrow: "オープンソース · Apache-2.0 · TypeScript",
  primaryCta: { label: "はじめる", href: "/ja/docs/getting-started/" },
  showcaseCta: {
    label: "ショーケースを見る",
    href: "/ja/docs/plugins/showcase",
  },
  githubCta: en.githubCta,
  language: { label: "English", href: "/", hreflang: "en" },
  hero: {
    ...en.hero,
    tagline: en.hero.tagline,
    lead: "Obsidian のノートと Markdown を、本当に自分のものといえる Web サイトへ。TypeScript を基盤に、Plugin で拡張し、あなたのワークフローに合わせてつくれます。",
    previewLabel: "Riebeckite でつくったサイトのプレビュー",
    previewStatus: "公開済み",
    previewTitle: "サイトはノートだけでは終わらない。",
    previewBody:
      "Markdown を起点に、使い慣れた Web 技術で体験そのものを組み立てられます。",
  },
  developer: {
    heading: "開発者のために。開発者を縛らない。",
    intro:
      "Web プラットフォームに近い設計なので、サイトはフレームワーク専用の例外ではなく、いつもの TypeScript プロジェクトとして扱えます。",
    features: [
      {
        title: "Familiar Web Development",
        body: "TypeScript、Hono JSX、CSS と、チームに馴染んだ道具を使えます。ルートとコンポーネントの責任はサイト側にあります。",
        code: "app/routes/index.tsx",
      },
      {
        title: "Components That Feel Natural",
        body: "Hono JSX のコンポーネントをそのまま組み合わせられます。Plugin が UI を公開し、配置はサイト側が決めます。",
        code: 'import { SeriesList } from "@example/plugin";',
      },
      {
        title: "Content and Code, Separated",
        body: "ノートとサイト実装を別々に管理したいときは、content.directory をサイトルートの外にある Vault へ向けられます。",
        code: 'directory: "../vault"',
      },
      {
        title: "An Extensible Ecosystem",
        body: "Plugin と Theme はパッケージとして導入・更新できます。必要な機能だけを選び、一箇所で設定します。",
        code: "plugins: [obsidianMarkdown()]",
      },
    ],
  },
  ownership: {
    heading: "サイトがフレームワークを抱え込む必要はない。",
    statement: "フレームワークは依存関係として。サイトは自分のリポジトリに。",
    body: "生成される Riebeckite サイトは、公開済みの @riebeckite パッケージに依存する通常のアプリケーションです。サイトコード、コンテンツ、Theme、Plugin の責任を分けられます。破壊的変更では移行対応が必要になることもありますが、サイト内にフレームワークのソースを抱え続ける必要はありません。",
    code: en.ownership.code,
    principles: [
      "パッケージマネージャーで依存関係を管理",
      "フレームワークとサイトコードの責務を分離",
      "Plugin を独立した npm パッケージとしてバージョン管理",
      "必要に応じてコンテンツ用リポジトリを分離",
    ],
  },
  notes: {
    heading: "ノートから Web サイトへ。",
    intro:
      "書いたファイルから始まり、公開可能な静的出力で終わるビルドです。コンテンツに必要な変換と見た目だけを加えます。",
    steps: [
      {
        title: "Obsidian Vault",
        body: "content/ または外部 Vault から Markdown を読み込みます。公式 Plugin で WikiLink を含む Obsidian 記法を扱えます。",
      },
      {
        title: "Riebeckite",
        body: "Plugin は Markdown・HTML を変換し、コンテンツグラフを拡張し、必要に応じてクライアント機能やページを追加します。",
      },
      {
        title: "Published Website",
        body: "Theme が見た目を担い、静的サイトビルドがホスティング先へ配置する dist/ を出力します。",
      },
    ],
  },
  start: {
    heading: "すぐに始める。",
    statement:
      "対話式コマンドひとつでサイトを作成。次のコマンドでローカル起動。",
    intro:
      "ジェネレーターでプロジェクト名、Preset、コンテンツソース、デプロイ方法を選びます。ローカル優先の既定値なら、公開は準備が整ってからです。",
    command: en.start.command,
    terminalLabel: "Riebeckite サイトを作成・起動するコマンド",
    terminalNote:
      "コマンドをコピーして実行し、開発サーバーが表示するローカル URL を開いてください。",
    link: {
      label: "Quick Start を読む →",
      href: "/ja/docs/getting-started/quick-start",
    },
  },
  extend: {
    heading: "すべてを拡張する。",
    statement: "機能は Plugin として。見た目は Theme として。",
    intro:
      "Plugin は Markdown・HTML の変換、コンポーネントの提供、クライアントエントリの追加、ページの生成を担えます。Theme は機能の責任を奪わず、見た目だけを変えます。",
    points: [
      "再利用する機能を npm パッケージとして配布",
      "defineConfig() でサイトの機能を設定",
      "Markdown・コンテンツ・UI の拡張点を明示",
      "Theme と Plugin を独立して開発・バージョン管理",
    ],
    code: en.extend.code,
    link: { label: "Plugin と API を見る →", href: "/ja/docs/plugins/" },
    themeLink: { label: "Theme を見る →", href: "/ja/docs/themes/" },
  },
  frustration: {
    heading: "不便さから生まれ、自由のために設計した。",
    statement:
      "Riebeckite は、知識ベースの上にもっと直接的にサイトをつくりたいという思いから始まりました。",
    body: "Quartz 4 を使うなかで、クライアント UI、インタラクティブな振る舞い、コンテンツの所有、フレームワーク固有の書き方にはトレードオフがあると感じました。Riebeckite は別の道を選びます。可能な限り標準的な Web 開発を使い、必要な拡張点を明確にし、サイトのアーキテクチャを自分のものにすること。このページは比較表ではなく、異なる優先順位から生まれた設計思想を伝えるものです。",
  },
  closing: {
    heading: en.closing.heading,
    body: "Markdown から始めて、思い描くサイトへ育てる自由を持ち続けましょう。",
    docs: { label: "ドキュメントを見る", href: "/ja/docs/" },
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
