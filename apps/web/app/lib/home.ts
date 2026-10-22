export type HomeLocale = "ja" | "en";

const HOME_REPO_URL = "https://github.com/Rerurate514/riebeckite";

export type HomeLink = { label: string; href: string; external?: boolean };

type HomeStep = { title: string; body: string };
type HomeResource = { link: HomeLink; body: string };

export type HomeCopy = {
  title: string;
  description: string;
  eyebrow: string;
  copyLabel: string;
  primaryCta: HomeLink;
  showcaseCta: HomeLink;
  githubCta: HomeLink;
  language: HomeLink & { hreflang: HomeLocale };
  hero: { title: string; lead: string; commandLabel: string; command: string };
  content: {
    heading: string;
    intro: string;
    sourceLabel: string;
    source: string;
    steps: HomeStep[];
    docs: HomeLink;
  };
  application: {
    heading: string;
    intro: string;
    body: string;
    points: string[];
    code: string;
    plugins: HomeLink;
    themes: HomeLink;
  };
  examples: { heading: string; intro: string; resources: HomeResource[] };
  continue: { heading: string; intro: string; docs: HomeLink };
};

const en: HomeCopy = {
  title: "Riebeckite — Markdown & Obsidian Website Framework",
  description:
    "Build and publish a website from Markdown and Obsidian notes with a TypeScript framework, independent plugins, themes, and content sources.",
  eyebrow: "Open source · Apache-2.0 · TypeScript",
  copyLabel: "Copy",
  primaryCta: { label: "Read the docs", href: "/docs/getting-started/" },
  showcaseCta: { label: "Plugin showcase", href: "/docs/plugins/showcase" },
  githubCta: { label: "GitHub", href: HOME_REPO_URL, external: true },
  language: { label: "日本語", href: "/ja/", hreflang: "ja" },
  hero: {
    title: "Build a static site from Markdown and Obsidian.",
    lead: "Riebeckite is a TypeScript framework for turning notes into a website. Start with Markdown, then write the routes, components, plugins, and theme your site needs.",
    commandLabel: "Create a project",
    command: "npx create-riebeckite",
  },
  content: {
    heading: "Keep content in the form you write.",
    intro:
      "Use content/ in the project or point the site at an external Obsidian vault. Public notes become static pages during the build.",
    sourceLabel: "content/notes/ownership.md",
    source:
      "---\npublish: true\ntitle: Ownership\n---\n\nA site should remain understandable after its framework changes.\n\nSee also: [[architecture]]",
    steps: [
      {
        title: "Write",
        body: "Keep notes in Markdown, including Obsidian syntax when you use the official plugin.",
      },
      {
        title: "Configure",
        body: "Choose the content directory, plugins, theme, and routes in the generated TypeScript site.",
      },
      {
        title: "Build",
        body: "Riebeckite writes the published site to dist/ for the host you choose.",
      },
    ],
    docs: {
      label: "Configure content sources",
      href: "/docs/guides/writing-content/",
    },
  },
  application: {
    heading: "Extend the generated application.",
    intro:
      "A generated site is a Hono JSX and TypeScript application. Plugins provide focused capabilities; the application decides how to use them.",
    body: "Add a plugin in the site configuration, compose its components in your routes, and keep presentation in a theme. Each responsibility stays in the package that owns it.",
    points: [
      "Use Hono JSX for site routes and components",
      "Transform Markdown or generate pages with plugins",
      "Install themes and plugins through the package manager",
    ],
    code: 'import { defineConfig } from "@riebeckite/core";\nimport { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";\n\nexport default defineConfig({\n  plugins: [obsidianMarkdown()],\n});',
    plugins: { label: "Browse plugins and APIs", href: "/docs/plugins/" },
    themes: { label: "Explore themes", href: "/docs/themes/" },
  },
  examples: {
    heading: "Inspect the parts before adding them.",
    intro:
      "The documentation includes working examples rather than a simulated product preview.",
    resources: [
      {
        link: { label: "Open Playground", href: "/playground" },
        body: "Edit a plugin fixture and inspect the rendered result in the browser.",
      },
      {
        link: { label: "View Plugin Showcase", href: "/docs/plugins/showcase" },
        body: "Compare Markdown source with the output of the available plugins.",
      },
      {
        link: { label: "Browse Theme Gallery", href: "/themes" },
        body: "Preview the themes that are published with the framework.",
      },
    ],
  },
  continue: {
    heading: "Continue with the documentation.",
    intro:
      "Set up a project, choose a preset, or read the API reference from the documentation.",
    docs: { label: "Documentation", href: "/docs/" },
  },
};

const ja: HomeCopy = {
  ...en,
  title: "Riebeckite — Markdown と Obsidian のサイトフレームワーク",
  description:
    "Markdown と Obsidian のノートから、TypeScript、独立した Plugin・Theme・コンテンツソースを使った Web サイトを作成・公開するフレームワークです。",
  eyebrow: "オープンソース · Apache-2.0 · TypeScript",
  copyLabel: "コピー",
  primaryCta: {
    label: "ドキュメントを読む",
    href: "/ja/docs/getting-started/",
  },
  showcaseCta: { label: "Plugin Showcase", href: "/ja/docs/plugins/showcase" },
  language: { label: "English", href: "/", hreflang: "en" },
  hero: {
    title: "Markdown と Obsidian から静的サイトをつくる。",
    lead: "Riebeckite は、ノートから Web サイトを構築する TypeScript フレームワークです。Markdown を起点に、必要なルート、コンポーネント、Plugin、Theme を実装できます。",
    commandLabel: "プロジェクトを作成する",
    command: en.hero.command,
  },
  content: {
    heading: "普段書いている形式でコンテンツを管理する。",
    intro:
      "プロジェクト内の content/、または外部の Obsidian Vault をコンテンツソースにできます。公開対象のノートはビルド時に静的ページになります。",
    sourceLabel: "content/notes/ownership.md",
    source: en.content.source,
    steps: [
      {
        title: "書く",
        body: "Markdown でノートを管理し、公式 Plugin を使う場合は Obsidian 記法もそのまま使えます。",
      },
      {
        title: "設定する",
        body: "コンテンツの場所、Plugin、Theme、ルートを生成された TypeScript サイトで選びます。",
      },
      {
        title: "ビルドする",
        body: "Riebeckite は公開用の静的ファイルを dist/ に出力します。",
      },
    ],
    docs: {
      label: "コンテンツソースを設定する",
      href: "/ja/docs/guides/writing-content/",
    },
  },
  application: {
    heading: "生成されたアプリケーションを拡張する。",
    intro:
      "生成されるサイトは Hono JSX と TypeScript のアプリケーションです。Plugin は機能を提供し、アプリケーション側で使い方を決めます。",
    body: "サイト設定に Plugin を追加し、ルート内でコンポーネントを組み合わせ、見た目は Theme で管理します。それぞれの責務をパッケージごとに分けたまま拡張できます。",
    points: [
      "Hono JSX でサイトのルートとコンポーネントを書く",
      "Plugin で Markdown を変換したりページを生成したりする",
      "パッケージマネージャーで Theme と Plugin を導入する",
    ],
    code: en.application.code,
    plugins: { label: "Plugin と API を見る", href: "/ja/docs/plugins/" },
    themes: { label: "Theme を見る", href: "/ja/docs/themes/" },
  },
  examples: {
    heading: "導入前に実際の動作を確認する。",
    intro:
      "シミュレーションではなく、公開済みの機能とドキュメントの実例を確認できます。",
    resources: [
      {
        link: { label: "Playground を開く", href: "/playground" },
        body: "Plugin のフィクスチャを編集し、ブラウザで出力を確認できます。",
      },
      {
        link: {
          label: "Plugin Showcase を見る",
          href: "/ja/docs/plugins/showcase",
        },
        body: "Markdown のソースと各 Plugin の出力を比較できます。",
      },
      {
        link: { label: "Theme Gallery を見る", href: "/themes" },
        body: "フレームワークとともに公開されている Theme を試せます。",
      },
    ],
  },
  continue: {
    heading: "次はドキュメントへ。",
    intro:
      "プロジェクトの作成、Preset の選択、API リファレンスはドキュメントで確認できます。",
    docs: { label: "ドキュメント", href: "/ja/docs/" },
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
