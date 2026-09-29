import {
  defaultLanguageForLocale,
  localizedContentFiles,
} from "./localized-content.js";
import { defaultSsrExternals } from "../vite_plugin.js";

export type SiteTemplateVariables = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly baseUrl: string;
  readonly locale: string;
};

export type SiteTemplateFile = {
  readonly path: string;
  readonly content: string;
};

export function siteTemplateFiles(
  variables: SiteTemplateVariables,
): readonly SiteTemplateFile[] {
  return [
    { path: "package.json", content: packageJson(variables) },
    { path: "riebeckite.config.ts", content: riebeckiteConfig(variables) },
    { path: "vite.config.ts", content: viteConfig() },
    { path: "tsconfig.json", content: tsconfig() },
    { path: ".gitignore", content: gitignore() },
    { path: "README.md", content: readme(variables) },
    ...localizedContentFiles(variables),
    { path: "app/server.ts", content: server() },
    { path: "app/client.ts", content: client() },
    { path: "app/config.ts", content: appConfig() },
    { path: "app/content.ts", content: appContent() },
    { path: "app/constants/paths.ts", content: paths() },
    { path: "app/global.d.ts", content: globalDeclarations() },
    { path: "app/style.css", content: style() },
    { path: "app/components/site-header.tsx", content: siteHeader() },
    { path: "app/components/article.tsx", content: article() },
    { path: "app/routes/_renderer.tsx", content: renderer() },
    { path: "app/routes/index.tsx", content: indexRoute() },
    { path: "app/routes/[slug{.+}].tsx", content: slugRoute() },
  ];
}

function packageJson(variables: SiteTemplateVariables): string {
  return `${JSON.stringify(
    {
      name: variables.name,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "riebeckite dev",
        build: "riebeckite build",
        check: "riebeckite check",
        doctor: "riebeckite doctor",
        inspect: "riebeckite inspect",
      },
      dependencies: {
        "@riebeckite/core": "^0.0.3",
        "@riebeckite/honox": "^0.0.3",
        "@riebeckite/plugin-color-mode": "^0.0.3",
        "@riebeckite/plugin-l10n": "^0.0.3",
        "@riebeckite/plugin-obsidian-markdown": "^0.0.3",
        "@riebeckite/theme-default": "^0.0.3",
        hono: "^4.12.25",
        honox: "0.1.56",
      },
      devDependencies: {
        "@hono/vite-build": "^1.11.1",
        "@riebeckite/cli": "^0.0.3",
        "@types/node": "^24.5.2",
        typescript: "^5.0.0",
        vite: "^8.0.9",
      },
    },
    null,
    2,
  )}\n`;
}

function riebeckiteConfig(variables: SiteTemplateVariables): string {
  const { title, description, baseUrl, locale } = variables;
  const languages = ["en", "ja", "zh-CN", "es", "de", "fr", "ko"];
  return `import { defineConfig } from "@riebeckite/core";
import { colorModePlugin } from "@riebeckite/plugin-color-mode";
import { l10n } from "@riebeckite/plugin-l10n";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: ${JSON.stringify(title)},
    description: ${JSON.stringify(description)},
    baseUrl: ${JSON.stringify(baseUrl)},
    locale: ${JSON.stringify(locale)},
  },
  content: {
    directory: "content",
  },
  theme: defaultTheme(),
plugins: [
    obsidianMarkdown(),
    colorModePlugin(),
    l10n({
      defaultLang: ${JSON.stringify(defaultLanguageForLocale(locale))},
      languages: ${JSON.stringify(languages)},
    }),
  ],
});
`;
}

function viteConfig(): string {
  const ssrExternals = [...defaultSsrExternals]
    .map((name) => `          "${name}",`)
    .join("\n");
  return `import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/node";
import {
  riebeckite,
  riebeckiteSsg,
  riebeckiteSsgExtensionMap,
} from "@riebeckite/honox";
import honox from "honox/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    honox({
      client: { input: ["/app/client.ts", "/app/style.css"] },
    }),
    riebeckite({ appRoot }),
    build(),
    riebeckiteSsg({
      entry: path.join(appRoot, "app/server.ts"),
      extensionMap: riebeckiteSsgExtensionMap(),
    }),
  ],
  environments: {
    ssr: {
      resolve: {
        external: [
${ssrExternals}
        ],
      },
    },
  },
});
`;
}

function tsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        jsx: "react-jsx",
        jsxImportSource: "hono/jsx",
        types: ["node", "vite/client"],
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        skipLibCheck: true,
      },
      include: [
        "app/**/*.ts",
        "app/**/*.tsx",
        "riebeckite.config.ts",
        "vite.config.ts",
      ],
    },
    null,
    2,
  )}\n`;
}

function gitignore(): string {
  return ["node_modules/", "dist/", ".riebeckite/", ""].join("\n");
}

function readme(variables: SiteTemplateVariables): string {
  return defaultLanguageForLocale(variables.locale) === "ja"
    ? jaReadme(variables)
    : enReadme(variables);
}

const REPO = "https://github.com/Rerurate514/riebeckite";

function enReadme(variables: SiteTemplateVariables): string {
  return [
    `# ${variables.title}`,
    "",
    "A multilingual Riebeckite site generated by `riebeckite init` — seven",
    "languages out of the box, plus a tour of the plugin and theme ecosystem.",
    "",
    "## What's inside",
    "",
    "- **Seven languages** (`en`, `ja`, `zh-CN`, `es`, `de`, `fr`, `ko`) via",
    `  [\`@riebeckite/plugin-l10n\`](${REPO}/blob/main/packages/plugins/l10n/README.md).`,
    "  Every page is translated; non-default languages are served under `/lang/`",
    "  paths, and each page carries a language switcher.",
    "- **Ecosystem tour pages**, written in all seven languages:",
    "  - `/framework/plugins` — representative plugins grouped by capability.",
    "  - `/framework/themes` — the bundled themes and how to switch.",
    "- The **HonoX application shell** under `app/` — routes, components, and the",
    "  renderer are yours to extend.",
    "",
    "Run `pnpm dev` and open the site to explore.",
    "",
    "## Commands",
    "",
    "```sh",
    "pnpm install",
    "pnpm exec riebeckite check",
    "pnpm exec riebeckite dev",
    "pnpm exec riebeckite build",
    "```",
    "",
    "## Localization",
    "",
    "Content lives in `content/` as plain Markdown. Translations sit next to the",
    "default file using the `<base>.<lang>.md` convention (`about.ja.md`,",
    "`about.en.md`). The default language keeps the unsuffixed path; the rest are",
    "served under `/lang/`.",
    "",
    "To add or remove a language, edit the `l10n(...)` plugin in",
    "`riebeckite.config.ts` and add or remove the matching translation files.",
    "",
    "## Extending",
    "",
    `- **Plugins**: browse [packages/plugins](${REPO}/tree/main/packages/plugins)`,
    "  in the Riebeckite repository — each package has its own README with options",
    "  and examples.",
    "- **Themes**: this starter uses `@riebeckite/theme-default`; swap it for",
    "  another theme in `riebeckite.config.ts`.",
    `- Docs: [English](${REPO}/blob/main/docs/en/README.md)`,
    `  · [日本語](${REPO}/blob/main/docs/ja/README.md)`,
    "",
  ].join("\n");
}

function jaReadme(variables: SiteTemplateVariables): string {
  return [
    `# ${variables.title}`,
    "",
    "`riebeckite init` で生成した多言語対応の Riebeckite サイトです。7 言語に対応し、",
    "プラグインとテーマのエコシステムを体感できる構成になっています。",
    "",
    "## 含まれているもの",
    "",
    "- **7 言語対応**（`en`, `ja`, `zh-CN`, `es`, `de`, `fr`, `ko`）—",
    `  [\`@riebeckite/plugin-l10n\`](${REPO}/blob/main/packages/plugins/l10n/README_ja.md)`,
    "  によるもの。すべてのページが翻訳され、既定言語以外は `/lang/` パスで配信され",
    "  ます。各ページには言語スイッチャーが付いています。",
    "- **エコシステム紹介ページ**（全 7 言語で作成）:",
    "  - `/framework/plugins` — 代表的なプラグインを機能別に紹介。",
    "  - `/framework/themes` — 同梱のテーマと切り替え方。",
    "- **HonoX アプリケーションシェル** `app/` — ルート・コンポーネント・レンダラー",
    "  は自由に拡張できます。",
    "",
    "`pnpm dev` を実行してサイトを開いてください。",
    "",
    "## コマンド",
    "",
    "```sh",
    "pnpm install",
    "pnpm exec riebeckite check",
    "pnpm exec riebeckite dev",
    "pnpm exec riebeckite build",
    "```",
    "",
    "## ローカライズ",
    "",
    "コンテンツは `content/` にプレーンな Markdown として置きます。翻訳ページは既定",
    "ファイルの隣に `<base>.<lang>.md` の規則で配置します（`about.ja.md`、",
    "`about.en.md` など）。既定言語は接尾辞なしのパス、それ以外は `/lang/` のパスで",
    "配信されます。",
    "",
    "言語の追加・削除は `riebeckite.config.ts` の `l10n(...)` プラグインを編集し、",
    "対応する翻訳ファイルを追加・削除してください。",
    "",
    "## 拡張",
    "",
    `- **プラグイン**: [packages/plugins](${REPO}/tree/main/packages/plugins) を`,
    "  参照してください。各パッケージにはオプションと例付きの README があります。",
    "- **テーマ**: このスターターは `@riebeckite/theme-default` を使用しています。",
    "  `riebeckite.config.ts` で別のテーマに差し替えられます。",
    `- ドキュメント: [English](${REPO}/blob/main/docs/en/README.md)`,
    `  · [日本語](${REPO}/blob/main/docs/ja/README.md)`,
    "",
  ].join("\n");
}

function server(): string {
  return `import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { createApp } from "honox/server";
import { config } from "./config";
import { content } from "./content";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
  },
});

export default app;
`;
}

function client(): string {
  return `import { initRiebeckiteClient } from "virtual:riebeckite/client";
import { createClient } from "honox/client";

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initRiebeckiteClient();
}
`;
}

function appConfig(): string {
  return `import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfigModule } from "@riebeckite/core";
import * as rawConfigModule from "../riebeckite.config";

const appRoot =
  process.env.RIEBECKITE_APP_ROOT ??
  fileURLToPath(new URL("../", import.meta.url));
const resolvedConfig = resolveConfigModule(rawConfigModule);

export const config = {
  ...resolvedConfig,
  content: {
    ...resolvedConfig.content,
    directory: path.resolve(appRoot, resolvedConfig.content.directory),
  },
};
`;
}

function appContent(): string {
  return `import { ContentManager } from "@riebeckite/core";
import { config } from "./config";
import { CONTENT_DIR } from "./constants/paths";

export const content = new ContentManager(
  CONTENT_DIR,
  config.content.exclude,
  {
    config,
    plugins: config.plugins,
  },
);
`;
}

function paths(): string {
  return `import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config";

const appRoot =
  process.env.RIEBECKITE_APP_ROOT ??
  fileURLToPath(new URL("../../", import.meta.url));

export const CONTENT_DIR = path.resolve(appRoot, config.content.directory);
export const ASSETS_ROOT = "public/";
`;
}

function globalDeclarations(): string {
  return `import type { PluginHeadTag } from "@riebeckite/core";

declare module "virtual:riebeckite/client" {
  export function initRiebeckiteClient(): void;
}

declare module "hono" {
  interface Env {
    Variables: {
      headTags?: readonly PluginHeadTag[];
      htmlLanguage?: string;
    };
    Bindings: Record<string, never>;
  }
}
`;
}

function style(): string {
  return `@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";

body {
  margin: 0;
  font-family: system-ui, sans-serif;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #d1d5db;
}

.site-header__home {
  color: #111827;
  font-weight: 700;
  text-decoration: none;
}

.site-article {
  display: block;
  max-width: 48rem;
  padding: 2rem 1rem;
  margin: 0 auto;
}
`;
}

function siteHeader(): string {
  return `import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { config } from "../config";

export function SiteHeader() {
  return (
    <header class="site-header">
      <a href="/" class="site-header__home">
        {config.site.title}
      </a>
      <ColorModeToggle />
    </header>
  );
}
`;
}

function article(): string {
  return `import type { PostContent } from "@riebeckite/core";
import { Article, ArticleContent, ArticleLayout } from "@riebeckite/honox/ui";

export function SiteArticle({
  post,
  afterMeta,
}: {
  post: PostContent;
  afterMeta?: string;
}) {
  return (
    <Article class="site-article">
      <ArticleLayout>
        <ArticleContent>
          {afterMeta ? (
            <div
              class="site-article__after-meta"
              dangerouslySetInnerHTML={{ __html: afterMeta }}
            />
          ) : null}
          <div dangerouslySetInnerHTML={{ __html: post.html ?? "" }} />
        </ArticleContent>
      </ArticleLayout>
    </Article>
  );
}
`;
}

function renderer(): string {
  return `import type { PluginHeadTag } from "@riebeckite/core";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import { ColorModeScript } from "@riebeckite/plugin-color-mode";
import { SiteHeader } from "../components/site-header";
import { config } from "../config";

function themeAttributes() {
  const { theme } = config;

  return {
    ...theme.attributes,
    "data-theme": theme.colorMode === "system" ? undefined : theme.colorMode,
    "data-theme-name": theme.name,
    "data-typography": theme.typography,
    "data-article-layout": theme.articleLayout,
  };
}

export default jsxRenderer(({ children }, c) => {
  const headTags: readonly PluginHeadTag[] = c.get("headTags") ?? [];

  return (
    <html
      lang={c.get("htmlLanguage") ?? config.site.locale}
      {...themeAttributes()}
    >
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{config.site.title}</title>
        <ColorModeScript />
        <Link href="/app/style.css" rel="stylesheet" />
        {headTags.map(renderHeadTag)}
        <Script src="/app/client.ts" async />
      </head>
      <body class="riebeckite-page">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
});

function renderHeadTag(tag: PluginHeadTag, index: number) {
  const key = \`\${tag.tag}-\${index}\`;
  if (tag.tag === "meta") return <meta {...tag.attrs} key={key} />;
  if (tag.tag === "link") return <link {...tag.attrs} key={key} />;
  return (
    <script
      {...tag.attrs}
      key={key}
      dangerouslySetInnerHTML={
        tag.children ? { __html: tag.children } : undefined
      }
    />
  );
}
`;
}

function indexRoute(): string {
  return `import { isPublished } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { config } from "../config";
import { content } from "../content";

export default createRoute(async (c) => {
  const manifest = await content.getManifest();
  const indexEntry = manifest.bySlug.get("index");
  if (indexEntry && indexEntry.permalink !== "/") {
    return c.redirect(indexEntry.permalink, 308);
  }

  const post = await content.getProcessedContent("index");
  if (!isPublished(config, post.frontmatter)) {
    return c.notFound();
  }

  if (indexEntry) {
    c.set("htmlLanguage", indexEntry.publicLocation.metadata?.["l10n.lang"]);
    c.set("headTags", indexEntry.headTags ?? []);
  }

  return c.render(
    <SiteArticle
      post={post}
      afterMeta={indexEntry?.bodySlots?.["article.after-meta"]}
    />,
  );
});
`;
}

function slugRoute(): string {
  return `import { isPublished } from "@riebeckite/core";
import {
  contentRouteSsgParams,
  resolveContentRoute,
} from "@riebeckite/honox/server";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { config } from "../config";
import { content } from "../content";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", async () => {
    const manifest = await content.getManifest();
    return manifest.entries
      .filter((entry) => isPublished(config, entry.frontmatter))
      .filter((entry) => entry.permalink !== "/")
      .map((entry) => ({ slug: entry.permalink.replace(/^\\/+/, "") }));
  }),
  async (c) => {
    const requestedSlug = c.req.param("slug");
    if (!requestedSlug) return c.notFound();
    if (/\\.[a-zA-Z0-9]+$/.test(requestedSlug)) return c.notFound();

    const manifest = await content.getManifest();
    const route = resolveContentRoute(manifest, c.req.path);
    if (!route) return c.notFound();
    if (route.kind === "redirect")
      return c.redirect(route.location, route.status);

    const post = await content.getProcessedContent(route.entry.slug);
    if (!isPublished(config, post.frontmatter)) {
      return c.notFound();
    }

    c.set("htmlLanguage", route.entry.publicLocation.metadata?.["l10n.lang"]);
    c.set("headTags", route.entry.headTags ?? []);

    return c.render(
      <SiteArticle
        post={post}
        afterMeta={route.entry.bodySlots?.["article.after-meta"]}
      />,
    );
  },
);
`;
}
